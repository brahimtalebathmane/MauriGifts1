import { create } from 'zustand';
import { storage } from '../src/utils/storage';
import type { User, Product, Order, Notification, Category } from '@/src/types';
import { STORAGE_KEYS } from '../src/config';
import { apiService } from '../src/services/api';

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
  refreshData: () => Promise<void>;
  refreshProducts: () => Promise<boolean>;
  refreshCategories: () => Promise<boolean>;
  
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

  refreshData: async () => {
    const state = get();
    if (!state.token) return;

    try {
      console.log('Refreshing global data...');
      const [productsResponse, categoriesResponse] = await Promise.all([
        apiService.getProducts(),
        apiService.getCategories(),
      ]);
      
      if (productsResponse.data) {
        console.log('Updated products in store:', Object.keys(productsResponse.data.products || {}).length, 'categories');
        set({ products: productsResponse.data.products || {} });
      }
      
      if (categoriesResponse.data) {
        console.log('Updated categories in store:', (categoriesResponse.data.categories || []).length, 'categories');
        set({ categories: categoriesResponse.data.categories || [] });
      }
      
      console.log('Global data refresh completed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  },

  refreshProducts: async () => {
    try {
      console.log('Refreshing products...');
      const response = await apiService.getProducts();
      if (response.data) {
        console.log('Products refreshed:', Object.keys(response.data.products || {}).length, 'categories');
        set({ products: response.data.products || {} });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing products:', error);
      return false;
    }
  },

  refreshCategories: async () => {
    try {
      console.log('Refreshing categories...');
      const response = await apiService.getCategories();
      if (response.data) {
        console.log('Categories refreshed:', (response.data.categories || []).length, 'categories');
        set({ categories: response.data.categories || [] });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing categories:', error);
      return false;
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