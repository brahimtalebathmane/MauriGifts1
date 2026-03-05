import { createClient } from '@supabase/supabase-js';

// تأكد من ضبط هذه المتغيرات في ملف .env
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const apiService = {
  /**
   * تفعيل/تعطيل المحفظة
   * بناءً على جدول users الخاص بك
   */
  async adminActivateWallet(token: string, userId: string, activate: boolean) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin_activate_wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // ضروري جداً لتمرير صلاحية الـ role 'admin'
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          user_id: userId, // المعرف uuid من جدول users
          activate: activate, // القيمة boolean لتحديث الحقل is_wallet_active
        }),
      });

      // إذا رد السيرفر بـ 403، فهذا يعني أن التوكن لا يملك صلاحية 'admin' في جدول users
      if (response.status === 403) {
        return { 
          data: null, 
          error: 'خطأ 403: حسابك لا يملك صلاحيات إدارية كافية أو الجلسة انتهت.' 
        };
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'حدث خطأ في السيرفر');

      return { data: result, error: null };
    } catch (error: any) {
      console.error('Wallet Error:', error);
      return { data: null, error: error.message || 'خطأ في الاتصال' };
    }
  },

  /**
   * تعديل الرصيد (wallet_balance)
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
      if (!response.ok) throw new Error(result.error || 'فشل تحديث الرصيد');

      return { data: result, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },
};