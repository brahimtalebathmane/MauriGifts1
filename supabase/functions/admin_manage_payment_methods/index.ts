import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const managePaymentMethodsSchema = z.object({
  token: z.string().min(1),
  action: z.enum(['list', 'create', 'update', 'delete']),
  payment_method: z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).optional(),
    logo_url: z.string().url().optional().nullable(),
    status: z.enum(['active', 'inactive']).optional(),
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
    const { token, action, payment_method } = managePaymentMethodsSchema.parse(body);

    const adminUserId = await validateAdminSession(supabase, token);

    switch (action) {
      case 'list': {
        const { data: paymentMethods, error } = await supabase
          .from('payment_methods')
          .select('*')
          .order('name');

        if (error) throw error;
        return new Response(
          JSON.stringify({ payment_methods: paymentMethods }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        if (!payment_method) throw new Error('بيانات طريقة الدفع مطلوبة');
        
        const { data: newPaymentMethod, error } = await supabase
          .from('payment_methods')
          .insert(payment_method)
          .select()
          .single();

        if (error) throw error;

        // Add audit log
        await supabase
          .from('audit_logs')
          .insert({
            actor_id: adminUserId,
            action: 'create_payment_method',
            target_type: 'payment_method',
            target_id: newPaymentMethod.id,
            meta: payment_method,
          });

        return new Response(
          JSON.stringify({ payment_method: newPaymentMethod }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        if (!payment_method?.id) throw new Error('معرف طريقة الدفع مطلوب');
        
        const { id, ...updateData } = payment_method;
        const { data: updatedPaymentMethod, error } = await supabase
          .from('payment_methods')
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
            action: 'update_payment_method',
            target_type: 'payment_method',
            target_id: id,
            meta: updateData,
          });

        return new Response(
          JSON.stringify({ payment_method: updatedPaymentMethod }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        if (!payment_method?.id) throw new Error('معرف طريقة الدفع مطلوب');
        
        const { error } = await supabase
          .from('payment_methods')
          .delete()
          .eq('id', payment_method.id);

        if (error) throw error;

        // Add audit log
        await supabase
          .from('audit_logs')
          .insert({
            actor_id: adminUserId,
            action: 'delete_payment_method',
            target_type: 'payment_method',
            target_id: payment_method.id,
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
    console.error('Manage payment methods error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في إدارة طرق الدفع' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});