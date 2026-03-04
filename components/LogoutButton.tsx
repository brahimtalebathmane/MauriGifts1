import React from 'react';
import { Platform, TouchableOpacity, Text, Alert } from 'react-native';
import { useAppStore } from '@/state/store';
import { supabase } from '@/lib/supabase-client';

const LogoutButton = () => {
  const logout = useAppStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      console.log('Logout started');

      // 1️⃣ إنهاء جلسة Supabase أولاً
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.log('Supabase signout error:', e);
      }

      // 2️⃣ تنفيذ logout من Zustand
      await logout();

      // 3️⃣ ضمان المسح الكامل على الويب
      if (Platform.OS === 'web') {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('/auth/login');
      }

      console.log('Logout completed');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('خطأ', 'فشل تسجيل الخروج');
    }
  };

  return (
    <TouchableOpacity
      onPress={handleLogout}
      style={{
        backgroundColor: '#dc2626',
        padding: 14,
        borderRadius: 10,
        marginTop: 20,
      }}
    >
      <Text
        style={{
          color: 'white',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: 16,
        }}
      >
        تسجيل الخروج
      </Text>
    </TouchableOpacity>
  );
};

export default LogoutButton;