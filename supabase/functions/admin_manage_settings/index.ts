import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const manageSettingsSchema = z.object({
  token: z.string().min(1),
  action: z.enum(['get', 'update']),
  settings: z.record(z.any()).optional(),
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
    const { token, action, settings } = manageSettingsSchema.parse(body);

    const adminUserId = await validateAdminSession(supabase, token);

    switch (action) {
      case 'get': {
        const { data: settingsData, error } = await supabase
          .from('settings')
          .select('*');

        if (error) throw error;

        const settingsMap = settingsData.reduce((acc: any, setting: any) => {
          try {
            acc[setting.key] = JSON.parse(setting.value);
          } catch {
            acc[setting.key] = setting.value;
          }
          return acc;
        }, {});

        return new Response(
          JSON.stringify({ settings: settingsMap }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!settings) throw new Error('الإعدادات مطلوبة');

        for (const [key, value] of Object.entries(settings)) {
          await supabase
            .from('settings')
            .upsert({
              key,
              value: JSON.stringify(value),
            });
        }

        // Add audit log
        await supabase
          .from('audit_logs')
          .insert({
            actor_id: adminUserId,
            action: 'update_settings',
            target_type: 'settings',
            meta: settings,
          });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('إجراء غير صالح');
    }

  } catch (error) {
    console.error('Manage settings error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في إدارة الإعدادات' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});