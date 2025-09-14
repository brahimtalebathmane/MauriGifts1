import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const adminListUsersSchema = z.object({
  token: z.string().min(1),
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
    const { token } = adminListUsersSchema.parse(body);

    await validateAdminSession(supabase, token);

    // Get users with order count
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        phone_number,
        role,
        created_at,
        orders (id)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const usersWithOrderCount = users.map(user => ({
      ...user,
      order_count: user.orders?.length || 0,
      orders: undefined, // Remove orders array from response
    }));

    return new Response(
      JSON.stringify({ users: usersWithOrderCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin list users error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في جلب المستخدمين' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});