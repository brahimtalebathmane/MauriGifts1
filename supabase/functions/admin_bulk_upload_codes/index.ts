import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const bulkUploadSchema = z.object({
  token: z.string().min(1),
  product_id: z.string().uuid(),
  codes: z.array(z.string().min(1)),
});

async function validateAdmin(supabase: any, token: string) {
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('user_id')
    .eq('token', token)
    .gte('expires_at', new Date().toISOString())
    .single();

  if (sessionError || !session) {
    throw new Error('جلسة غير صالحة');
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user_id)
    .single();

  if (userError || !user || user.role !== 'admin') {
    throw new Error('غير مصرح لك');
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
    const { token, product_id, codes } = bulkUploadSchema.parse(body);

    const adminId = await validateAdmin(supabase, token);

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'المنتج غير موجود' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (codes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'يجب إدخال رمز واحد على الأقل' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uniqueCodes = [...new Set(codes)];
    const codeRecords = uniqueCodes.map(code => ({
      product_id,
      code_value: code.trim(),
      is_sold: false,
    }));

    const { data: insertedCodes, error: insertError } = await supabase
      .from('product_codes')
      .insert(codeRecords)
      .select();

    if (insertError) throw insertError;

    await supabase
      .from('audit_logs')
      .insert({
        actor_id: adminId,
        action: 'bulk_upload_codes',
        target_type: 'product_codes',
        target_id: product_id,
        meta: {
          product_name: product.name,
          codes_count: insertedCodes.length,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        codes_added: insertedCodes.length,
        duplicates_removed: codes.length - uniqueCodes.length,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Bulk upload error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في رفع الأكواد' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
