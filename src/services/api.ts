import { API_CONFIG } from '../config';
import type { ApiResponse } from '../types';

class ApiClient {
  // ✅ تعديل دالة الطلب لاستقبال التوكن بشكل صحيح
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    token?: string
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': API_CONFIG.anonKey || '',
        ...((options.headers as Record<string, string>) || {}),
      };

      // ✅ إذا تم تمرير توكن المستخدم، نضعه في Authorization
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['Authorization'] = `Bearer ${API_CONFIG.anonKey}`;
      }

      const response = await fetch(`${API_CONFIG.baseUrl}/${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();
      
      if (!response.ok) {
        // إذا كان الخطأ 401، فهذا يعني أن التوكن غير صالح أو مفقود
        return { error: data.error || data.message || `خطأ ${response.status}: غير مصرح بالوصول` };
      }

      return { data };
    } catch (error) {
      console.error('API Request failed:', error);
      return { error: 'خطأ في الاتصال بالخادم' };
    }
  }

  // Auth endpoints
  async signup(name: string, phoneNumber: string, pin: string) {
    return this.request('signup', {
      method: 'POST',
      body: JSON.stringify({ name, phone_number: phoneNumber, pin }),
    });
  }

  async login(phoneNumber: string, pin: string) {
    return this.request('login', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber, pin }),
    });
  }

  async getMe(token: string) {
    return this.request('me', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }, token); // تمرير التوكن للهيدر
  }

  // Products and Categories
  async getProducts() {
    return this.request('list_products', { method: 'GET' });
  }

  async getCategories() {
    return this.request('list_categories', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // Orders
  async createOrder(token: string, productId: string, paymentMethod: string, paymentNumber: string) {
    return this.request('create_order', {
      method: 'POST',
      body: JSON.stringify({ token, product_id: productId, payment_method: paymentMethod, payment_number: paymentNumber }),
    }, token);
  }

  async getMyOrders(token: string) {
    return this.request('my_orders', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }, token);
  }

  // Admin endpoints
  async adminListUsers(token: string) {
    return this.request('admin_list_users', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }, token);
  }

  // ✅ الدالة المسببة للمشكلة - تم إصلاح تمرير التوكن
  async adminActivateWallet(token: string, userId: string, activate: boolean) {
    return this.request('admin_activate_wallet', {
      method: 'POST',
      body: JSON.stringify({
        token, // يرسل في الجسم للتوافق مع الدوال القديمة
        user_id: userId,
        activate,
      }),
    }, token); // ✅ تمرير التوكن هنا يضعه في Authorization Header ويحل الـ 401
  }

  async adminAdjustWallet(token: string, userId: string, amount: number, operation: 'add' | 'subtract') {
    return this.request('admin_adjust_wallet', {
      method: 'POST',
      body: JSON.stringify({ token, user_id: userId, amount, operation }),
    }, token);
  }

  async getPaymentMethods() {
    return this.request('list_payment_methods', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }
}

export const apiService = new ApiClient();