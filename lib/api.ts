import { createClient } from '@supabase/supabase-js';

// استخراج المتغيرات من البيئة (Environment Variables)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const apiService = {
  /**
   * دالة تفعيل أو تعطيل المحفظة للمستخدم
   * @param token - توكن المصادقة الخاص بالأدمن
   * @param userId - معرف المستخدم المراد تعديل محفظته
   * @param activate - حالة التفعيل (true/false)
   */
  async adminActivateWallet(token: string, userId: string, activate: boolean) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin_activate_wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ✅ إضافة Bearer ضرورية جداً لتجاوز خطأ 403
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          user_id: userId, // ملاحظة: نستخدم user_id (بالشرطة) كما تتوقعها أغلب دوال Supabase
          activate: activate,
        }),
      });

      if (response.status === 403) {
        return { 
          data: null, 
          error: 'صلاحيات غير كافية. يرجى تسجيل الخروج والدخول مجدداً لتحديث تصريح الأدمن.' 
        };
      }

      const result = await response.json();
      
      if (!response.ok) {
        return { data: null, error: result.error || 'حدث خطأ أثناء تنفيذ العملية' };
      }

      return { data: result, error: null };
    } catch (error: any) {
      console.error('API Error (Activate Wallet):', error);
      return { data: null, error: 'خطأ في الاتصال بالسيرفر، تأكد من اتصالك بالإنترنت' };
    }
  },

  /**
   * دالة تعديل رصيد المحفظة (إضافة أو خصم)
   */
  async adminAdjustWallet(token: string, userId: string, amount: number, operation: 'add' | 'subtract') {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin_adjust_wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          user_id: userId,
          amount: amount,
          operation: operation,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { data: null, error: result.error || 'فشل تحديث الرصيد' };
      }

      return { data: result, error: null };
    } catch (error: any) {
      return { data: null, error: 'خطأ في الشبكة' };
    }
  }
};