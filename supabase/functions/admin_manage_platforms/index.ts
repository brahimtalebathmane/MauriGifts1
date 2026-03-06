import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const createPlatformSchema = z.object({
  token: z.string().min(1),
  action: z.enum(['create', 'update', 'delete', 'list']),
  platform_id: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  logo_url: z.string().optional(),
  website_url: z.string().optional(),
  tutorial_video_url: z.string().optional(),
  active: z.boolean().optional(),
});

async function validateAdmin(supabase: any, token: string) {
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('user_id')
    .eq('token', token)
    .gte('expires_at', new Date().toISOString())
    .single();

  if (sessionError || !session) {
    throw new Error('جلسة غير صالحة');
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user_id)
    .single();

  if (userError || !user || user.role !== 'admin') {
    throw new Error('غير مصرح لك');
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
    const { token, action, platform_id, name, logo_url, website_url, tutorial_video_url, active } = createPlatformSchema.parse(body);

    await validateAdmin(supabase, token);

    if (action === 'list') {
      const { data: platforms, error } = await supabase
        .from('platforms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ platforms }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create') {
      if (!name) {
        return new Response(
          JSON.stringify({ error: 'الاسم مطلوب' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: platform, error } = await supabase
        .from('platforms')
        .insert({
          name,
          logo_url: logo_url || null,
          website_url: website_url || null,
          tutorial_video_url: tutorial_video_url || null,
          active: active !== undefined ? active : true,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ platform }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update') {
      if (!platform_id) {
        return new Response(
          JSON.stringify({ error: 'معرف المنصة مطلوب' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updateData: any = { updated_at: new Date().toISOString() };
      if (name) updateData.name = name;
      if (logo_url !== undefined) updateData.logo_url = logo_url;
      if (website_url !== undefined) updateData.website_url = website_url;
      if (tutorial_video_url !== undefined) updateData.tutorial_video_url = tutorial_video_url;
      if (active !== undefined) updateData.active = active;

      const { data: platform, error } = await supabase
        .from('platforms')
        .update(updateData)
        .eq('id', platform_id)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ platform }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      if (!platform_id) {
        return new Response(
          JSON.stringify({ error: 'معرف المنصة مطلوب' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('platforms')
        .delete()
        .eq('id', platform_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'إجراء غير صالح' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Platform management error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في إدارة المنصات' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
