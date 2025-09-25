export interface User {
  id: string;
  name: string;
  phone_number: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category: ProductCategory;
  name: string;
  sku: string;
  price_mru: number;
  active: boolean;
  meta: ProductMeta;
  created_at: string;
}

export interface ProductMeta {
  title?: string;
  amount?: string;
  currency?: string;
}

export interface Order {
  id: string;
  user_id: string;
  product_id: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_number?: string;
  receipt_path?: string;
  admin_note?: string;
  delivery_code?: string;
  created_at: string;
  updated_at: string;
  products?: Product;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  payload?: NotificationPayload;
  seen: boolean;
  created_at: string;
}

export interface NotificationPayload {
  order_id?: string;
  delivery_code?: string;
  reason?: string;
}

export interface AdminOrder extends Order {
  users: {
    id: string;
    name: string;
    phone_number: string;
  };
  products: {
    id: string;
    name: string;
    price_mru: number;
  };
}

export interface UserData {
  id: string;
  name: string;
  phone_number: string;
  role: string;
  created_at: string;
  order_count: number;
}

export interface Settings {
  payment_number: string;
  app_name: string;
  app_version: string;
}

export interface Category {
  id: string;
  name: string;
  image_url?: string;
  created_at: string;
}

export interface PaymentMethodDB {
  id: string;
  name: string;
  logo_url?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface ProductGuide {
  id: string;
  product_id: string;
  step_number: number;
  image_url?: string;
  description?: string;
  support_link?: string;
  created_at: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

// Enums
export type PaymentMethod = 'bankily' | 'sidad' | 'masrvi' | 'bimbank' | 'amanati' | 'klik';
export type ProductCategory = 'pubg' | 'free_fire' | 'itunes' | 'psn';
export type OrderStatus = 'awaiting_payment' | 'under_review' | 'completed' | 'rejected';
export type UserRole = 'user' | 'admin';