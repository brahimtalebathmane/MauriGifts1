import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Fallback storage for web
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

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

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isLoading: boolean;
  
  // Products
  products: Record<string, Product[]>;
  
  // Orders
  orders: Order[];
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  setAuth: (user: User | null, token: string | null) => void;
  setProducts: (products: Record<string, Product[]>) => void;
  setOrders: (orders: Order[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  
  // Persistence
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  token: null,
  isLoading: true,
  products: {},
  orders: [],
  notifications: [],
  unreadCount: 0,

  // Actions
  setAuth: (user, token) => {
    set({ user, token });
    get().saveToStorage();
  },

  setProducts: (products) => set({ products }),

  setOrders: (orders) => set({ orders }),

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter(n => !n.seen).length;
    set({ notifications, unreadCount });
  },

  setLoading: (isLoading) => set({ isLoading }),

  logout: async () => {
    console.log('Logging out user...');
    set({ 
      user: null, 
      token: null, 
      orders: [],
      notifications: [],
      unreadCount: 0,
      products: {},
      isLoading: false
    });
    
    try {
      await Promise.all([
        storage.removeItem('user'),
        storage.removeItem('token'),
      ]);
      console.log('Storage cleared successfully');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },

  // Persistence
  loadFromStorage: async () => {
    try {
      const [userStr, tokenStr] = await Promise.all([
        storage.getItem('user'),
        storage.getItem('token'),
      ]);
      
      const user = userStr ? JSON.parse(userStr) : null;
      const token = tokenStr || null;
      
      set({ user, token, isLoading: false });
    } catch (error) {
      console.error('Error loading from storage:', error);
      set({ isLoading: false });
    }
  },

  saveToStorage: async () => {
    try {
      const { user, token } = get();
      
      if (user) {
        await storage.setItem('user', JSON.stringify(user));
      }
      if (token) {
        await storage.setItem('token', token);
      }
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  },
}));