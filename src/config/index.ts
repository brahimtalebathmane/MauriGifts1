export const APP_CONFIG = {
  name: 'MauriGift',
  version: '1.0.0',
  defaultPaymentNumber: '41791082',
  sessionTtlDays: 30,
  receiptsBucket: 'receipts',
} as const;

export const API_CONFIG = {
  baseUrl: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
} as const;

export const STORAGE_KEYS = {
  user: 'user',
  token: 'token',
} as const;

export const ROUTES = {
  auth: {
    login: '/auth/login',
    signup: '/auth/signup',
  },
  main: {
    home: '/(tabs)',
    orders: '/(tabs)/orders',
    notifications: '/(tabs)/notifications',
    profile: '/(tabs)/profile',
  },
  admin: {
    users: '/(tabs)/admin/users',
    orders: '/(tabs)/admin/orders',
    products: '/(tabs)/admin/products',
    categories: '/(tabs)/admin/categories',
    paymentMethods: '/(tabs)/admin/payment-methods',
  },
  payment: '/payment',
  category: '/category',
} as const;