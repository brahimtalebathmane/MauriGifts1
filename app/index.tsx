import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/state/store';

export default function IndexScreen() {
  const { user, token, isLoading } = useAppStore();

  useEffect(() => {
    if (!isLoading) {
      if (user && token) {
        router.replace('/(tabs)');
      } else {
        router.replace('/auth/login');
      }
    }
  }, [user, token, isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#f3f3f4" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f16',
  },
});