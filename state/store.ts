import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    set({ 
      user: null, 
      token: null, 
      orders: [], 
      notifications: [], 
      unreadCount: 0 
    });
    await AsyncStorage.multiRemove(['user', 'token']);
  },

  // Persistence
  loadFromStorage: async () => {
    try {
      const [userStr, tokenStr] = await AsyncStorage.multiGet(['user', 'token']);
      
      const user = userStr[1] ? JSON.parse(userStr[1]) : null;
      const token = tokenStr[1] || null;
      
      set({ user, token, isLoading: false });
    } catch (error) {
      console.error('Error loading from storage:', error);
      set({ isLoading: false });
    }
  },

  saveToStorage: async () => {
    try {
      const { user, token } = get();
      const items: [string, string][] = [
        ['user', user ? JSON.stringify(user) : ''],
        ['token', token || ''],
      ];
      
      await AsyncStorage.multiSet(items.filter(([_, value]) => value !== ''));
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  },
}));