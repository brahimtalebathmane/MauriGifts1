import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const getProductGuidesSchema = z.object({
  token: z.string().min(1),
  product_id: z.string().uuid(),
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
    const { token, product_id } = getProductGuidesSchema.parse(body);

    const userId = await validateSession(supabase, token);

    // Check if user has purchased this product
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', product_id)
      .eq('status', 'completed')
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'يجب شراء المنتج أولاً للوصول إلى الدليل' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get product guides
    const { data: guides, error } = await supabase
      .from('product_guides')
      .select('*')
      .eq('product_id', product_id)
      .order('step_number');

    if (error) throw error;

    return new Response(
      JSON.stringify({ guides }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get product guides error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في جلب دليل المنتج' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});