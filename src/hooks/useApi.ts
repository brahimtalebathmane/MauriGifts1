import { useState, useCallback } from 'react';
import { showErrorToast } from '@/src/utils/toast';

interface UseApiOptions {
  showErrors?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export const useApi = <T = any>(options: UseApiOptions = {}) => {
  const { showErrors = true, onSuccess, onError } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<any>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiCall();
      
      if (response.data) {
        setData(response.data);
        onSuccess?.(response.data);
        return { success: true, data: response.data };
      } else {
        const errorMessage = response.error || 'حدث خطأ غير متوقع';
        setError(errorMessage);
        
        if (showErrors) {
          showErrorToast(errorMessage);
        }
        
        onError?.(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = 'خطأ في الاتصال بالخادم';
      setError(errorMessage);
      
      if (showErrors) {
        showErrorToast(errorMessage);
      }
      
      onError?.(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [showErrors, onSuccess, onError]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    loading,
    error,
    data,
    execute,
    reset,
  };
};