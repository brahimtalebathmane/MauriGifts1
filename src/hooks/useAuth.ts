import { useCallback } from 'react';
import { router } from 'expo-router';
import { useAppStore } from '@/state/store';
import { apiService } from '@/src/services/api';
import { showErrorToast, showSuccessToast } from '@/src/utils/toast';
import { ROUTES } from '@/src/config/app';

export const useAuth = () => {
  const { setAuth, logout: storeLogout, user, token, isLoading } = useAppStore();

  const login = useCallback(async (phoneNumber: string, pin: string) => {
    try {
      const response = await apiService.login(phoneNumber, pin);
      
      if (response.data) {
        setAuth(response.data.user, response.data.token);
        router.replace(ROUTES.main.home);
        return { success: true };
      } else {
        showErrorToast(response.error || 'خطأ في تسجيل الدخول');
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      showErrorToast('خطأ في الاتصال بالخادم');
      return { success: false, error: 'Network error' };
    }
  }, [setAuth]);

  const signup = useCallback(async (name: string, phoneNumber: string, pin: string) => {
    try {
      const response = await apiService.signup(name, phoneNumber, pin);
      
      if (response.data) {
        setAuth(response.data.user, response.data.token);
        router.replace(ROUTES.main.home);
        return { success: true };
      } else {
        showErrorToast(response.error || 'خطأ في إنشاء الحساب');
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Signup error:', error);
      showErrorToast('خطأ في الاتصال بالخادم');
      return { success: false, error: 'Network error' };
    }
  }, [setAuth]);

  const logout = useCallback(async () => {
    try {
      await storeLogout();
      router.replace(ROUTES.auth.login);
      showSuccessToast('تم تسجيل الخروج بنجاح');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [storeLogout]);

  const isAdmin = user?.role === 'admin';

  return {
    user,
    token,
    isLoading,
    isAdmin,
    login,
    signup,
    logout,
  };
};