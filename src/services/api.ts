import { API_CONFIG } from '../config';
import type { ApiResponse } from '../types';

class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    userToken?: string
  ): Promise<ApiResponse<T>> {
    try {
      // محاولة جلب التوكن من التخزين المحلي إذا لم يتم تمريره (لضمان عدم حدوث 401)
      let finalToken = userToken;
      if (!finalToken) {
        const storedAuth = localStorage.getItem('supabase.auth.token') || 
                          localStorage.getItem('sb-gyuicmqdtxjyomkiydmc-auth-token'); 
        if (storedAuth) {
          try {
            const parsed = JSON.parse(storedAuth);
            finalToken = parsed.access_token || parsed.currentSession?.access_token;
          } catch (e) {
            console.error("Error parsing token", e);
          }
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': API_CONFIG.anonKey || '',
      };

      // ✅ الحل الجذري للـ 401: وضع التوكن في الهيدر بشكل إجباري
      if (finalToken) {
        headers['Authorization'] = `Bearer ${finalToken}`;
      } else {
        headers['Authorization'] = `Bearer ${API_CONFIG.anonKey}`;
      }

      const response = await fetch(`${API_CONFIG.baseUrl}/${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers },
      });

      if (response.status === 401) {
        return { error: 'غير مصرح لك (401): يرجى تسجيل الخروج والدخول مرة أخرى.' };
      }

      const data = await response.json();
      
      if (!response.ok) {
        return { error: data.error || data.message || `خطأ ${response.status}` };
      }

      return { data };
    } catch (error: any) {
      console.error('API Request failed:', error);
      return { error: 'فشل الاتصال بالخادم.' };
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

  // --- Admin Operations (المناطق الحساسة) ---
  async adminListUsers(token: string) {
    return this.request('admin_list_users', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }, token);
  }

  async adminActivateWallet(token: string, userId: string, activate: boolean) {
    console.log("🚀 Sending activation request for:", userId, "Status:", activate);
    return this.request('admin_activate_wallet', {
      method: 'POST',
      body: JSON.stringify({
        token, // للجسم
        user_id: userId,
        activate,
      }),
    }, token); // للهيدر (حل الـ 401)
  }

  async adminAdjustWallet(token: string, userId: string, amount: number, operation: 'add' | 'subtract') {
    return this.request('admin_adjust_wallet', {
      method: 'POST',
      body: JSON.stringify({ token, user_id: userId, amount, operation }),
    }, token);
  }

  // --- Public Data ---
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
    return this.request('get_payment_methods', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // --- User Operations ---
  async getMe(token: string) {
    return this.request('me', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }, token);
  }

  async createOrder(token: string, productId: string, paymentMethod: string, paymentNumber: string) {
    return this.request('create_order', {
      method: 'POST',
      body: JSON.stringify({
        token,
        product_id: productId,
        payment_method: paymentMethod,
        payment_number: paymentNumber,
      }),
    }, token);
  }

  async uploadReceipt(token: string, orderId: string, imageBase64: string, fileExtension: string) {
    return this.request('upload_receipt', {
      method: 'POST',
      body: JSON.stringify({
        token,
        order_id: orderId,
        image_base64: imageBase64,
        file_extension: fileExtension,
      }),
    }, token);
  }

  async getMyOrders(token: string) {
    return this.request('my_orders', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }, token);
  }
}

export const apiService = new ApiClient();