import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const notificationsSchema = z.object({
  token: z.string().min(1),
  mark_seen: z.boolean().optional(),
});

async function validateSession(supabase: any, token: string) {
  const { data: session, error } = await supabase
    .from('sessions')
    .select('user_id, expires_at')
    .eq('token', token)
    .gte('expires_at', new Date().toISOString())
    .single();

  if (error || !session) {
    throw new Error('جلسة غير صالحة');
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
    const { token, mark_seen } = notificationsSchema.parse(body);

    const userId = await validateSession(supabase, token);

    // Mark all as seen if requested
    if (mark_seen) {
      await supabase
        .from('notifications')
        .update({ seen: true })
        .eq('user_id', userId)
        .eq('seen', false);
    }

    // Get notifications
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return new Response(
      JSON.stringify({ notifications }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notifications error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في جلب الإشعارات' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});