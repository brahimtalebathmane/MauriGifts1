import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const manageCategoriesSchema = z.object({
  token: z.string().min(1),
  action: z.enum(['list', 'create', 'update', 'delete']),
  category: z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).optional(),
    image_url: z.string().url().optional().nullable(),
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
    const { token, action, category } = manageCategoriesSchema.parse(body);

    const adminUserId = await validateAdminSession(supabase, token);

    switch (action) {
      case 'list': {
        const { data: categories, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (error) throw error;
        return new Response(
          JSON.stringify({ categories }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        if (!category) throw new Error('بيانات الفئة مطلوبة');
        
        const { data: newCategory, error } = await supabase
          .from('categories')
          .insert(category)
          .select()
          .single();

        if (error) throw error;

        // Add audit log
        await supabase
          .from('audit_logs')
          .insert({
            actor_id: adminUserId,
            action: 'create_category',
            target_type: 'category',
            target_id: newCategory.id,
            meta: category,
          });

        return new Response(
          JSON.stringify({ category: newCategory }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!category?.id) throw new Error('معرف الفئة مطلوب');
        
        const { id, ...updateData } = category;
        const { data: updatedCategory, error } = await supabase
          .from('categories')
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
            action: 'update_category',
            target_type: 'category',
            target_id: id,
            meta: updateData,
          });

        return new Response(
          JSON.stringify({ category: updatedCategory }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!category?.id) throw new Error('معرف الفئة مطلوب');
        
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', category.id);

        if (error) throw error;

        // Add audit log
        await supabase
          .from('audit_logs')
          .insert({
            actor_id: adminUserId,
            action: 'delete_category',
            target_type: 'category',
            target_id: category.id,
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
    console.error('Manage categories error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في إدارة الفئات' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});