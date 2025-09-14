import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const adminListOrdersSchema = z.object({
  token: z.string().min(1),
  status: z.enum(['awaiting_payment', 'under_review', 'completed', 'rejected']).optional(),
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { token, status } = adminListOrdersSchema.parse(body);

    await validateAdminSession(supabase, token);

    let query = supabase
      .from('orders')
      .select(`
        *,
        users (id, name, phone_number),
        products (*)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    return new Response(
      JSON.stringify({ orders }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin list orders error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في جلب الطلبات' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});