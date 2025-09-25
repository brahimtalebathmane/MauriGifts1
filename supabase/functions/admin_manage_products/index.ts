import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const manageProductsSchema = z.object({
  token: z.string().min(1),
  action: z.enum(['list', 'create', 'update', 'delete']),
  product: z.object({
    id: z.string().uuid().optional(),
    category_id: z.string().uuid().optional(),
    name: z.string().min(1).optional(),
    sku: z.string().min(1).optional(),
    price_mru: z.number().positive().optional(),
    active: z.boolean().optional(),
    meta: z.any().optional(),
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
    const { token, action, product } = manageProductsSchema.parse(body);

    const adminUserId = await validateAdminSession(supabase, token);

    switch (action) {
      case 'list': {
        const { data: products, error } = await supabase
          .from('products')
          .select(`
            *,
            categories (
              id,
              name
            )
          `)
          .order('created_at', { ascending: false })
          .order('price_mru');

        if (error) throw error;
        return new Response(
          JSON.stringify({ products }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        if (!product) throw new Error('بيانات المنتج مطلوبة');
        
        // Validate required fields
        if (!product.name || !product.sku || !product.price_mru) {
          throw new Error('الاسم ورمز المنتج والسعر مطلوبة');
        }
        
        // Ensure category_id is provided
        if (!product.category_id) {
          throw new Error('يجب اختيار فئة للمنتج');
        }
        
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert(product)
          .select(`
            *,
            categories (
              id,
              name
            )
          `)
          .single();

        if (error) throw error;

        // Add audit log
        await supabase
          .from('audit_logs')
          .insert({
            actor_id: adminUserId,
            action: 'create_product',
            target_type: 'product',
            target_id: newProduct.id,
            meta: product,
          });

        return new Response(
          JSON.stringify({ product: newProduct }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!product?.id) throw new Error('معرف المنتج مطلوب');
        
        const { id, ...updateData } = product;
        const { data: updatedProduct, error } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', id)
          .select(`
            *,
            categories (
              id,
              name
            )
          `)
          .single();

        if (error) throw error;

        // Add audit log
        await supabase
          .from('audit_logs')
          .insert({
            actor_id: adminUserId,
            action: 'update_product',
            target_type: 'product',
            target_id: id,
            meta: updateData,
          });

        return new Response(
          JSON.stringify({ product: updatedProduct }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!product?.id) throw new Error('معرف المنتج مطلوب');
        
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', product.id);

        if (error) throw error;

        // Add audit log
        await supabase
          .from('audit_logs')
          .insert({
            actor_id: adminUserId,
            action: 'delete_product',
            target_type: 'product',
            target_id: product.id,
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
    console.error('Manage products error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في إدارة المنتجات' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});