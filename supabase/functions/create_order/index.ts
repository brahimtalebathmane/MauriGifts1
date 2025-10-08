import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const createOrderSchema = z.object({
  token: z.string().min(1),
  product_id: z.string().uuid(),
  payment_method: z.enum(['bankily', 'sidad', 'masrvi', 'bimbank', 'amanati', 'klik']),
  payment_number: z.string().min(1),
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
    const { token, product_id, payment_method, payment_number } = createOrderSchema.parse(body);

    const userId = await validateSession(supabase, token);

    // Verify product exists and is active
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('active', true)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'المنتج غير متوفر' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        product_id,
        payment_method,
        payment_number,
        status: 'under_review'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Add audit log
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: userId,
        action: 'create_order',
        target_type: 'order',
        target_id: order.id,
        meta: { product_id, payment_method, payment_number },
      });

    return new Response(
      JSON.stringify({ order_id: order.id }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Create order error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في إنشاء الطلب' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});