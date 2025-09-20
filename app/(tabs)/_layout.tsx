import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Chrome as Home, ShoppingBag, Bell, User, Users, ClipboardList, Settings } from 'lucide-react-native';
import { useAppStore } from '@/state/store';
import { useI18n } from '@/hooks/useI18n';

export default function TabLayout() {
  const { user, unreadCount } = useAppStore();
  const { t } = useI18n();
  const isAdmin = user?.role === 'admin';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home.categories'),
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="orders"
        options={{
          title: t('orders.my_orders'),
          tabBarIcon: ({ color, size }) => (
            <ShoppingBag size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: t('notifications.title'),
          tabBarIcon: ({ color, size }) => (
            <Bell size={size} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontSize: 10,
            minWidth: 16,
            height: 16,
          },
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title'),
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="admin/users"
        options={{
          title: t('admin.users'),
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} />
          ),
          href: isAdmin ? '/admin/users' : null,
        }}
      />

      <Tabs.Screen
        name="admin/orders"
        options={{
          title: t('admin.orders'),
          tabBarIcon: ({ color, size }) => (
            <ClipboardList size={size} color={color} />
          ),
          href: isAdmin ? '/admin/orders' : null,
        }}
      />

      <Tabs.Screen
        name="admin/products"
        options={{
          title: 'إدارة المنتجات',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
          href: isAdmin ? '/admin/products' : null,
        }}
      />
    </Tabs>
  );
}