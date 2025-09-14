import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const adminRejectOrderSchema = z.object({
  token: z.string().min(1),
  order_id: z.string().uuid(),
  reason: z.string().min(1).max(500),
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
    const { token, order_id, reason } = adminRejectOrderSchema.parse(body);

    const adminUserId = await validateAdminSession(supabase, token);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        users (name),
        products (name)
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'الطلب غير موجود' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'rejected',
        admin_note: reason,
      })
      .eq('id', order_id);

    if (updateError) throw updateError;

    // Create notification for user
    await supabase
      .from('notifications')
      .insert({
        user_id: order.user_id,
        title: 'تم رفض طلبك',
        body: `تم رفض طلب ${order.products.name}. السبب: ${reason}`,
        payload: { order_id, reason },
      });

    // Add audit log
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: adminUserId,
        action: 'reject_order',
        target_type: 'order',
        target_id: order_id,
        meta: { reason },
      });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin reject order error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في رفض الطلب' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});