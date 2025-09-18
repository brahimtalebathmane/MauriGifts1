const API_BASE_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY || ''}`,
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

  // Admin product management
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

  // Admin settings management
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
}

export const api = new ApiClient();