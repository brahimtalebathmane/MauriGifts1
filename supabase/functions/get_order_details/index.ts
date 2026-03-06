import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const orderDetailsSchema = z.object({
  token: z.string().min(1),
  order_id: z.string().uuid(),
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
    const { token, order_id } = orderDetailsSchema.parse(body);

    const userId = await validateSession(supabase, token);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        products (
          id,
          name,
          sku,
          price_mru,
          category_id,
          categories (
            id,
            name,
            platform_id,
            platforms (
              id,
              name,
              logo_url,
              website_url,
              tutorial_video_url
            )
          )
        )
      `)
      .eq('id', order_id)
      .eq('user_id', userId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'الطلب غير موجود' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: codeRecord } = await supabase
      .from('product_codes')
      .select('code_value')
      .eq('order_id', order_id)
      .eq('is_sold', true)
      .maybeSingle();

    const orderDetails = {
      ...order,
      delivery_code: codeRecord?.code_value || order.delivery_code || null,
    };

    return new Response(
      JSON.stringify({ order: orderDetails }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get order details error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في جلب تفاصيل الطلب' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
