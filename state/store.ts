import { create } from 'zustand';
import { storage } from '../src/utils/storage';
import type { User, Product, Order, Notification } from '@/src/types';
import { STORAGE_KEYS } from '../src/config';

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

  // Categories
  categories: Category[];
  
  // Actions
  setAuth: (user: User | null, token: string | null) => void;
  setProducts: (products: Record<string, Product[]>) => void;
  setCategories: (categories: Category[]) => void;
  setOrders: (orders: Order[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  refreshProducts: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  
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
  categories: [],
  unreadCount: 0,

  // Actions
  setAuth: (user, token) => {
    set({ user, token });
    get().saveToStorage();
  },

  setProducts: (products) => set({ products }),

  setCategories: (categories) => set({ categories }),

  setOrders: (orders) => set({ orders }),

  setNotifications: (notifications) => {
    const unreadCount = notifications.filter(n => !n.seen).length;
    set({ notifications, unreadCount });
  },

  // Add method to refresh products after changes
  refreshProducts: async () => {
    try {
      const { apiService } = await import('../src/services/api');
      const response = await apiService.getProducts();
      if (response.data) {
        set({ products: response.data.products || {} });
      }
    } catch (error) {
      console.error('Error refreshing products:', error);
    }
  },

  refreshCategories: async () => {
    try {
      const { apiService } = await import('../src/services/api');
      const response = await apiService.getCategories();
      if (response.data) {
        set({ categories: response.data.categories || [] });
      }
    } catch (error) {
      console.error('Error refreshing categories:', error);
    }
  },

  setLoading: (isLoading) => set({ isLoading }),

  logout: async () => {
    set({ 
      user: null, 
      token: null, 
      orders: [],
      notifications: [],
      categories: [],
      unreadCount: 0,
      products: {},
      isLoading: false
    });
    
    try {
      await Promise.all([
        storage.removeItem(STORAGE_KEYS.user),
        storage.removeItem(STORAGE_KEYS.token),
      ]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },

  // Persistence
  loadFromStorage: async () => {
    try {
      const [userStr, tokenStr] = await Promise.all([
        storage.getItem(STORAGE_KEYS.user),
        storage.getItem(STORAGE_KEYS.token),
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
        await storage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
      }
      if (token) {
        await storage.setItem(STORAGE_KEYS.token, token);
      }
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  },
}));