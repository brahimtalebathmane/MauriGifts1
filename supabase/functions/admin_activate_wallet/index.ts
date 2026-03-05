import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  // 1. التعامل مع طلبات OPTIONS الخاصة بـ CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // إنشاء عميل Supabase باستخدام مفاتيح النظام
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // استخدام مفتاح الخدمة لتجاوز الـ RLS
    );

    // استقبال البيانات من الـ Frontend
    const { user_id, activate } = await req.json();
    
    // جلب التوكن من الهيدر (Authorization: Bearer <token>)
    const authHeader = req.headers.get('Authorization')?.split(' ')[1];

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'لم يتم توفير توكن المصادقة' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. التحقق من صحة التوكن وجلب بيانات صاحب الطلب
    const { data: { user: authUserSession }, error: authError } = await supabaseAdmin.auth.getUser(authHeader);

    if (authError || !authUserSession) {
      return new Response(
        JSON.stringify({ error: 'جلسة العمل غير صالحة أو منتهية' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. التحقق من رتبة المستخدم (Admin) في جدول users
    const { data: adminRecord, error: adminError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', authUserSession.id)
      .single();

    if (adminError || !adminRecord || adminRecord.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'غير مسموح: يجب أن تكون مديراً للقيام بهذا الإجراء' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. تنفيذ عملية التحديث للمستخدم المستهدف
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        is_wallet_active: activate,
        updated_at: new Date().toISOString() 
      })
      .eq('id', user_id)
      .select('id, name, phone_number, role, is_wallet_active, wallet_balance, created_at, updated_at')
      .single();

    if (updateError) {
      throw new Error(`فشل تحديث البيانات: ${updateError.message}`);
    }

    // العودة بالنتيجة الناجحة
    return new Response(
      JSON.stringify({ user: updatedUser, message: 'تم تحديث حالة المحفظة بنجاح' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Function Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});