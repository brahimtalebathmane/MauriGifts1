import { API_CONFIG } from '../config';
import type { ApiResponse } from '../types';

class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    token?: string // إضافة باراميتر اختياري للتوكن
  ): Promise<ApiResponse<T>> {
    try {
      // إعداد الهيدرز بشكل ديناميكي
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': API_CONFIG.anonKey || '',
        ...((options.headers as Record<string, string>) || {}),
      };

      // إذا وُجد توكن، نضعه في الهيدر بتنسيق Bearer الصحيح
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (API_CONFIG.anonKey) {
        headers['Authorization'] = `Bearer ${API_CONFIG.anonKey}`;
      }

      const response = await fetch(`${API_CONFIG.baseUrl}/${endpoint}`, {
        ...options,
        headers,
      });

      // التعامل مع حالة عدم وجود محتوى (مثلاً 204)
      if (response.status === 204) return { data: {} as T };

      const data = await response.json();
      
      if (!response.ok) {
        return { error: data.error || data.message || 'حدث خطأ غير متوقع' };
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
      body: JSON.stringify({
        name,
        phone_number: phoneNumber,
        pin,
      }),
    });
  }

  async login(phoneNumber: string, pin: string) {
    return this.request('login', {
      method: 'POST',
      body: JSON.stringify({
        phone_number: phoneNumber,
        pin,
      }),
    });
  }

  async getMe(token: string) {
    return this.request('me', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }, token);
  }

  // Products and Categories
  async getProducts() {
    return this.request('list_products', {
      method: 'GET',
    });
  }

  async getCategories() {
    return this.request('list_categories', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // Orders
  async createOrder(
    token: string,
    productId: string,
    paymentMethod: string,
    paymentNumber: string
  ) {
    if (!token || !productId || !paymentMethod || !paymentNumber) {
      return { error: 'جميع البيانات مطلوبة' };
    }

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

  async uploadReceipt(
    token: string,
    orderId: string,
    fileBase64: string,
    fileExt: string
  ) {
    if (!token || !orderId || !fileBase64 || !fileExt) {
      return { error: 'جميع البيانات مطلوبة لرفع الإيصال' };
    }

    return this.request('upload_receipt', {
      method: 'POST',
      body: JSON.stringify({
        token,
        order_id: orderId,
        fileBase64,
        fileExt,
      }),
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

  async adminListOrders(token: string, status?: string) {
    return this.request('admin_list_orders', {
      method: 'POST',
      body: JSON.stringify({ token, status }),
    }, token);
  }

  async adminApproveOrder(token: string, orderId: string, deliveryCode: string) {
    return this.request('admin_approve_order', {
      method: 'POST',
      body: JSON.stringify({
        token,
        order_id: orderId,
        delivery_code: deliveryCode,
      }),
    }, token);
  }

  async adminRejectOrder(token: string, orderId: string, reason: string) {
    return this.request('admin_reject_order', {
      method: 'POST',
      body: JSON.stringify({
        token,
        order_id: orderId,
        reason,
      }),
    }, token);
  }

  // Notifications
  async getNotifications(token: string, markSeen?: boolean) {
    return this.request('notifications', {
      method: 'POST',
      body: JSON.stringify({
        token,
        mark_seen: markSeen,
      }),
    }, token);
  }

  // Change PIN
  async changePin(token: string, currentPin: string, newPin: string) {
    return this.request('change_pin', {
      method: 'POST',
      body: JSON.stringify({
        token,
        current_pin: currentPin,
        new_pin: newPin,
      }),
    }, token);
  }

  // Admin management endpoints
  async adminManageProducts(
    token: string,
    action: 'list' | 'create' | 'update' | 'delete',
    product?: any
  ) {
    return this.request('admin_manage_products', {
      method: 'POST',
      body: JSON.stringify({
        token,
        action,
        product,
      }),
    }, token);
  }

  async adminManageCategories(
    token: string,
    action: 'list' | 'create' | 'update' | 'delete',
    category?: any
  ) {
    return this.request('admin_manage_categories', {
      method: 'POST',
      body: JSON.stringify({
        token,
        action,
        category,
      }),
    }, token);
  }

  async adminManagePaymentMethods(
    token: string,
    action: 'list' | 'create' | 'update' | 'delete',
    paymentMethod?: any
  ) {
    return this.request('admin_manage_payment_methods', {
      method: 'POST',
      body: JSON.stringify({
        token,
        action,
        payment_method: paymentMethod,
      }),
    }, token);
  }

  async adminManageSettings(
    token: string,
    action: 'get' | 'update',
    settings?: Record<string, any>
  ) {
    return this.request('admin_manage_settings', {
      method: 'POST',
      body: JSON.stringify({
        token,
        action,
        settings,
      }),
    }, token);
  }

  async getPaymentMethods() {
    return this.request('list_payment_methods', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getProductGuides(token: string, productId: string) {
    return this.request('get_product_guides', {
      method: 'POST',
      body: JSON.stringify({
        token,
        product_id: productId,
      }),
    }, token);
  }

  // Wallet endpoints
  async adminActivateWallet(token: string, userId: string, activate: boolean) {
    return this.request('admin_activate_wallet', {
      method: 'POST',
      body: JSON.stringify({
        token,
        user_id: userId,
        activate,
      }),
    }, token);
  }

  async adminAdjustWallet(
    token: string,
    userId: string,
    amount: number,
    operation: 'add' | 'subtract'
  ) {
    return this.request('admin_adjust_wallet', {
      method: 'POST',
      body: JSON.stringify({
        token,
        user_id: userId,
        amount,
        operation,
      }),
    }, token);
  }

  async getWalletLimits() {
    return this.request('get_wallet_limits', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }
}

export const apiService = new ApiClient();