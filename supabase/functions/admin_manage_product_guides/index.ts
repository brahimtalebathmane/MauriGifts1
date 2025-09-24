import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const manageProductGuidesSchema = z.object({
  token: z.string().min(1),
  action: z.enum(['list', 'create', 'update', 'delete']),
  guide: z.object({
    id: z.string().uuid().optional(),
    product_id: z.string().uuid().optional(),
    step_number: z.number().int().positive().optional(),
    image_url: z.string().url().optional().nullable(),
    description: z.string().optional().nullable(),
    support_link: z.string().url().optional().nullable(),
  }).optional(),
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
    const { token, action, guide } = manageProductGuidesSchema.parse(body);

    const adminUserId = await validateAdminSession(supabase, token);

    switch (action) {
      case 'list': {
        const { data: guides, error } = await supabase
          .from('product_guides')
          .select(`
            *,
            products (name, category)
          `)
          .order('product_id')
          .order('step_number');

        if (error) throw error;
        return new Response(
          JSON.stringify({ guides }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        if (!guide) throw new Error('بيانات الدليل مطلوبة');
        
        const { data: newGuide, error } = await supabase
          .from('product_guides')
          .insert(guide)
          .select()
          .single();

        if (error) throw error;

        // Add audit log
        await supabase
          .from('audit_logs')
          .insert({
            actor_id: adminUserId,
            action: 'create_product_guide',
            target_type: 'product_guide',
            target_id: newGuide.id,
            meta: guide,
          });

        return new Response(
          JSON.stringify({ guide: newGuide }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!guide?.id) throw new Error('معرف الدليل مطلوب');
        
        const { id, ...updateData } = guide;
        const { data: updatedGuide, error } = await supabase
          .from('product_guides')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        // Add audit log
        await supabase
          .from('audit_logs')
          .insert({
            actor_id: adminUserId,
            action: 'update_product_guide',
            target_type: 'product_guide',
            target_id: id,
            meta: updateData,
          });

        return new Response(
          JSON.stringify({ guide: updatedGuide }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!guide?.id) throw new Error('معرف الدليل مطلوب');
        
        const { error } = await supabase
          .from('product_guides')
          .delete()
          .eq('id', guide.id);

        if (error) throw error;

        // Add audit log
        await supabase
          .from('audit_logs')
          .insert({
            actor_id: adminUserId,
            action: 'delete_product_guide',
            target_type: 'product_guide',
            target_id: guide.id,
            meta: {},
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
    console.error('Manage product guides error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في إدارة أدلة المنتجات' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});