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
  payment_method: z.string().min(1),
  payment_number: z.string().min(1),
});

const validPaymentMethods = ['bankily', 'sidad', 'masrvi', 'bimbank', 'amanati', 'klik', 'wallet'];

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

async function assignCodeToOrder(supabase: any, productId: string, orderId: string) {
  const { data: availableCode, error: codeError } = await supabase
    .from('product_codes')
    .select('id, code_value')
    .eq('product_id', productId)
    .eq('is_sold', false)
    .limit(1)
    .maybeSingle();

  if (codeError) {
    console.error('Error fetching available code:', codeError);
    throw new Error('خطأ في جلب الكود');
  }

  if (!availableCode) {
    throw new Error('المنتج غير متوفر في المخزون');
  }

  const { error: updateError } = await supabase
    .from('product_codes')
    .update({
      is_sold: true,
      order_id: orderId,
      sold_at: new Date().toISOString(),
    })
    .eq('id', availableCode.id)
    .eq('is_sold', false);

  if (updateError) {
    console.error('Error updating code:', updateError);
    throw new Error('خطأ في تخصيص الكود');
  }

  const { error: orderUpdateError } = await supabase
    .from('orders')
    .update({ delivery_code: availableCode.code_value })
    .eq('id', orderId);

  if (orderUpdateError) {
    console.error('Error updating order with code:', orderUpdateError);
  }

  return availableCode.code_value;
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

    if (!validPaymentMethods.includes(payment_method)) {
      return new Response(
        JSON.stringify({ error: `طريقة الدفع غير صالحة. القيم المسموحة: ${validPaymentMethods.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = await validateSession(supabase, token);

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

    if (payment_method === 'wallet') {
      const { count: stockCount } = await supabase
        .from('product_codes')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', product_id)
        .eq('is_sold', false);

      if (!stockCount || stockCount === 0) {
        return new Response(
          JSON.stringify({ error: 'المنتج غير متوفر في المخزون' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('is_wallet_active, wallet_balance')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'خطأ في التحقق من بيانات المستخدم' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!user.is_wallet_active) {
        return new Response(
          JSON.stringify({ error: 'المحفظة غير مفعلة' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (user.wallet_balance < product.price_mru) {
        return new Response(
          JSON.stringify({ error: 'رصيد المحفظة غير كافٍ' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        product_id,
        payment_method,
        payment_number,
        status: payment_method === 'wallet' ? 'pending' : 'under_review'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    if (payment_method === 'wallet') {
      try {
        const deliveryCode = await assignCodeToOrder(supabase, product_id, order.id);

        await supabase
          .from('orders')
          .update({ status: 'completed' })
          .eq('id', order.id);

        await supabase
          .from('audit_logs')
          .insert({
            actor_id: userId,
            action: 'wallet_purchase',
            target_type: 'order',
            target_id: order.id,
            meta: { product_id, payment_method, auto_delivered: true },
          });

        return new Response(
          JSON.stringify({
            order_id: order.id,
            delivery_code: deliveryCode,
            status: 'completed',
            instant_delivery: true
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (codeError) {
        await supabase
          .from('orders')
          .update({ status: 'rejected', admin_note: codeError.message })
          .eq('id', order.id);

        return new Response(
          JSON.stringify({ error: codeError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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
      JSON.stringify({ order_id: order.id, status: 'under_review' }),
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
