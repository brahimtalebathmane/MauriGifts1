import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const changePinSchema = z.object({
  token: z.string().min(1),
  current_pin: z.string().length(4).regex(/^\d{4}$/),
  new_pin: z.string().length(4).regex(/^\d{4}$/),
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
    const { token, current_pin, new_pin } = changePinSchema.parse(body);

    const user = await validateSession(supabase, token);

    // Verify current PIN
    if (user.pin !== current_pin) {
      return new Response(
        JSON.stringify({ error: 'الرمز الحالي غير صحيح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update PIN
    const { error: updateError } = await supabase
      .from('users')
      .update({ pin: new_pin })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Change PIN error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في تغيير الرمز' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});