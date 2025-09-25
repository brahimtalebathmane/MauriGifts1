import { API_CONFIG } from '@/src/config';
import type { ApiResponse } from '@/src/types';

class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': API_CONFIG.anonKey || '',
          'Authorization': `Bearer ${API_CONFIG.anonKey || ''}`,
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { error: data.error || 'حدث خطأ غير متوقع' };
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
    });
  }

  // Products
  async getProducts() {
    return this.request('list_products', {
      method: 'GET',
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
    });
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
    });
  }

  async getMyOrders(token: string) {
    return this.request('my_orders', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  // Admin endpoints
  async adminListUsers(token: string) {
    return this.request('admin_list_users', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async adminListOrders(token: string, status?: string) {
    return this.request('admin_list_orders', {
      method: 'POST',
      body: JSON.stringify({ token, status }),
    });
  }

  async adminApproveOrder(token: string, orderId: string, deliveryCode: string) {
    return this.request('admin_approve_order', {
      method: 'POST',
      body: JSON.stringify({
        token,
        order_id: orderId,
        delivery_code: deliveryCode,
      }),
    });
  }

  async adminRejectOrder(token: string, orderId: string, reason: string) {
    return this.request('admin_reject_order', {
      method: 'POST',
      body: JSON.stringify({
        token,
        order_id: orderId,
        reason,
      }),
    });
  }

  // Notifications
  async getNotifications(token: string, markSeen?: boolean) {
    return this.request('notifications', {
      method: 'POST',
      body: JSON.stringify({
        token,
        mark_seen: markSeen,
      }),
    });
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
    });
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
    });
  }

  async adminGetCategories(token: string) {
    return this.request('admin_manage_categories', {
      method: 'POST',
      body: JSON.stringify({
        token,
        action: 'list',
      }),
    });
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
    });
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
    });
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
    });
  }

  async adminManageProductGuides(
    token: string,
    action: 'list' | 'create' | 'update' | 'delete',
    guide?: any
  ) {
    return this.request('admin_manage_product_guides', {
      method: 'POST',
      body: JSON.stringify({
        token,
        action,
        guide,
      }),
    });
  }

  // Public endpoints
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

  async getProductGuides(token: string, productId: string) {
    return this.request('get_product_guides', {
      method: 'POST',
      body: JSON.stringify({
        token,
        product_id: productId,
      }),
    });
  }
}

export const apiService = new ApiClient();