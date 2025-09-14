import { useEffect, useState } from 'react';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';
import arTranslations from '../i18n/ar.json';

export const useI18n = () => {
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    // Force RTL for Arabic
    if (!I18nManager.isRTL) {
      I18nManager.forceRTL(true);
      I18nManager.allowRTL(true);
    }
    setIsRTL(true);
  }, []);

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = arTranslations;
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  return { t, isRTL };
};