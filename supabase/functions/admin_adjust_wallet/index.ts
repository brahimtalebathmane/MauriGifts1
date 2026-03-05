import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const adjustWalletSchema = z.object({
  token: z.string().min(1),
  user_id: z.string().uuid(),
  amount: z.number().positive(),
  operation: z.enum(['add', 'subtract']),
});

async function validateAdminSession(supabase: any, token: string) {
  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      user_id,
      expires_at,
      users (role)
    `)
    .eq('token', token)
    .gte('expires_at', new Date().toISOString())
    .single();

  if (error || !session || session.users.role !== 'admin') {
    throw new Error('غير مصرح لك بالوصول');
  }

  return session.user_id;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { token, user_id, amount, operation } = adjustWalletSchema.parse(body);

    await validateAdminSession(supabase, token);

    const { data: targetUser } = await supabase
      .from('users')
      .select('wallet_balance, is_wallet_active')
      .eq('id', user_id)
      .maybeSingle();

    if (!targetUser) {
      throw new Error('المستخدم غير موجود');
    }

    if (!targetUser.is_wallet_active) {
      throw new Error('المحفظة غير مفعلة');
    }

    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'wallet_global_limits')
      .maybeSingle();

    const limits = settings?.value || { max_balance: 5000 };
    const currentBalance = parseFloat(targetUser.wallet_balance.toString());

    let newBalance: number;
    if (operation === 'add') {
      newBalance = currentBalance + amount;
    } else {
      newBalance = currentBalance - amount;
    }

    if (newBalance < 0) {
      throw new Error('الرصيد غير كافٍ');
    }

    if (newBalance > limits.max_balance) {
      throw new Error(`الرصيد لا يمكن أن يتجاوز ${limits.max_balance} أوقية`);
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        wallet_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)
      .select('id, name, phone_number, role, is_wallet_active, wallet_balance, created_at, updated_at')
      .single();

    if (updateError) {
      throw new Error(`فشل تحديث الرصيد: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ user: updatedUser }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Adjust wallet error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في تعديل الرصيد' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
