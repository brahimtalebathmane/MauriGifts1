export const APP_CONFIG = {
  NAME: 'MauriGift',
  VERSION: '1.0.0',
  DEFAULT_PAYMENT_NUMBER: '41791082',
  SESSION_TTL_DAYS: 30,
  RECEIPTS_BUCKET: 'receipts',
} as const;

export const API_CONFIG = {
  BASE_URL: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`,
  ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
} as const;

export const STORAGE_KEYS = {
  USER: 'user',
  TOKEN: 'token',
} as const;

export const ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
  },
  MAIN: {
    HOME: '/(tabs)',
    ORDERS: '/(tabs)/orders',
    NOTIFICATIONS: '/(tabs)/notifications',
    PROFILE: '/(tabs)/profile',
  },
  ADMIN: {
    USERS: '/(tabs)/admin/users',
    ORDERS: '/(tabs)/admin/orders',
    PRODUCTS: '/(tabs)/admin/products',
    CATEGORIES: '/(tabs)/admin/categories',
    PAYMENT_METHODS: '/(tabs)/admin/payment-methods',
  },
  PAYMENT: '/payment',
  CATEGORY: '/category',
} as const;