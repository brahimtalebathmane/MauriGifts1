import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const meSchema = z.object({
  token: z.string().min(1),
});

async function validateSession(supabase: any, token: string) {
  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      user_id,
      expires_at,
      users (*)
    `)
    .eq('token', token)
    .gte('expires_at', new Date().toISOString())
    .single();

  if (error || !session) {
    throw new Error('جلسة غير صالحة');
  }

  return session.users;
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
    const { token } = meSchema.parse(body);

    const user = await validateSession(supabase, token);

    // Remove PIN from response
    const { pin, ...userResponse } = user;

    return new Response(
      JSON.stringify({ user: userResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Me error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في جلب بيانات المستخدم' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});