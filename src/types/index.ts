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
  category: 'pubg' | 'free_fire' | 'itunes' | 'psn';
  name: string;
  sku: string;
  price_mru: number;
  active: boolean;
  meta: any;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  product_id: string;
  status: 'awaiting_payment' | 'under_review' | 'completed' | 'rejected';
  payment_method: 'bankily' | 'sidad' | 'masrvi' | 'bimbank' | 'amanati' | 'klik';
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
  payload?: any;
  seen: boolean;
  created_at: string;
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
  created_at?: string;
}

export interface PaymentMethodDB {
  id: string;
  name: string;
  logo_url?: string;
  status: 'active' | 'inactive';
  created_at?: string;
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

export type PaymentMethod = 'bankily' | 'sidad' | 'masrvi' | 'bimbank' | 'amanati' | 'klik';
export type ProductCategory = 'pubg' | 'free_fire' | 'itunes' | 'psn';
export type OrderStatus = 'awaiting_payment' | 'under_review' | 'completed' | 'rejected';