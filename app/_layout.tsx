import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAppStore } from '../state/store';

export default function RootLayout() {
  useFrameworkReady();
  const { loadFromStorage } = useAppStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="category/[id]" />
        <Stack.Screen name="payment" />
        <Stack.Screen name="index" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
      <Toast />
    </>
  );
}