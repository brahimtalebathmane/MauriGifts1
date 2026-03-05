import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const activateWalletSchema = z.object({
  token: z.string().min(1),
  user_id: z.string().uuid(),
  activate: z.boolean(),
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
    const { token, user_id, activate } = activateWalletSchema.parse(body);

    await validateAdminSession(supabase, token);

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        is_wallet_active: activate,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)
      .select('id, name, phone_number, role, is_wallet_active, wallet_balance, created_at, updated_at')
      .single();

    if (updateError) {
      throw new Error(`فشل تحديث البيانات: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ user: updatedUser }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Activate wallet error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في تحديث المحفظة' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});