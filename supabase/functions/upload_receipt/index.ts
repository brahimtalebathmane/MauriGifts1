import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const uploadReceiptSchema = z.object({
  token: z.string().min(1),
  order_id: z.string().uuid(),
  fileBase64: z.string().min(1),
  fileExt: z.enum(['jpg', 'jpeg', 'png', 'webp']),
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
    const { token, order_id, fileBase64, fileExt } = uploadReceiptSchema.parse(body);

    const userId = await validateSession(supabase, token);

    // Verify order belongs to user
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .eq('user_id', userId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'الطلب غير موجود' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert base64 to Uint8Array
    const fileData = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `receipts/${order_id}/${timestamp}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, fileData, {
        contentType: `image/${fileExt}`,
        cacheControl: '3600',
      });

    if (uploadError) throw uploadError;

    // Update order with receipt path
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        receipt_path: uploadData.path
      })
      .eq('id', order_id);

    if (updateError) throw updateError;

    // Create notification for user
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'تم إرسال الطلب بنجاح',
        body: `تم إرسال طلبك بنجاح وهو الآن قيد المراجعة من قبل الإدارة.`,
        payload: { order_id },
      });

    // Add audit log
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: userId,
        action: 'upload_receipt',
        target_type: 'order',
        target_id: order_id,
        meta: { receipt_path: uploadData.path },
      });

    return new Response(
      JSON.stringify({ success: true, path: uploadData.path }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Upload receipt error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في رفع الإيصال' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});