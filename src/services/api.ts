import { API_CONFIG } from '../config';
import type { ApiResponse } from '../types';

class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    userToken?: string // التوكن الخاص بالمستخدم المسجل
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': API_CONFIG.anonKey || '',
      };

      // ✅ الحل الجذري: إذا كان هناك توكن للمستخدم، يجب أن يكون هو الـ Authorization
      // الخطأ 401 يحدث لأن السيرفر يتلقى anonKey بينما يحتاج توكن الأدمن
      if (userToken && userToken.trim() !== '') {
        headers['Authorization'] = `Bearer ${userToken}`;
      } else {
        headers['Authorization'] = `Bearer ${API_CONFIG.anonKey}`;
      }

      // دمج أي هيدرز إضافية مرسلة في الخيارات
      if (options.headers) {
        Object.assign(headers, options.headers);
      }

      const response = await fetch(`${API_CONFIG.baseUrl}/${endpoint}`, {
        ...options,
        headers,
      });

      // التحقق من حالة الرد قبل محاولة قراءة JSON
      if (response.status === 401) {
        return { error: 'جلسة العمل انتهت أو غير صالحة (401). يرجى إعادة تسجيل الدخول.' };
      }

      const data = await response.json();
      
      if (!response.ok) {
        return { error: data.error || data.message || `خطأ من السيرفر (${response.status})` };
      }

      return { data };
    } catch (error: any) {
      console.error('API Request failed:', error);
      return { error: 'فشل الاتصال بالخادم. تأكد من جودة الإنترنت.' };
    }
  }

  // --- Auth ---
  async signup(name: string, phone_number: string, pin: string) {
    return this.request('signup', {
      method: 'POST',
      body: JSON.stringify({ name, phone_number, pin }),
    });
  }

  async login(phone_number: string, pin: string) {
    return this.request('login', {
      method: 'POST',
      body: JSON.stringify({ phone_number, pin }),
    });
  }

  async getMe(token: string) {
    return this.request('me', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }, token);
  }

  // --- Admin Operations ---
  async adminListUsers(token: string) {
    return this.request('admin_list_users', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }, token);
  }

  /**
   * ✅ الدالة التي تسبب الخطأ 401 حالياً
   */
  async adminActivateWallet(token: string, userId: string, activate: boolean) {
    return this.request('admin_activate_wallet', {
      method: 'POST',
      body: JSON.stringify({
        token, // نرسله في الـ Body احتياطاً للدوال القديمة
        user_id: userId,
        activate,
      }),
    }, token); // ✅ نرسله هنا ليتم وضعه في الـ Header (حل الـ 401)
  }

  async adminAdjustWallet(token: string, userId: string, amount: number, operation: 'add' | 'subtract') {
    return this.request('admin_adjust_wallet', {
      method: 'POST',
      body: JSON.stringify({ token, user_id: userId, amount, operation }),
    }, token);
  }

  // --- Lists ---
  async getProducts() {
    return this.request('list_products', { method: 'GET' });
  }

  async getCategories() {
    return this.request('list_categories', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }
  
  async getPaymentMethods() {
    return this.request('list_payment_methods', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }
}

export const apiService = new ApiClient();