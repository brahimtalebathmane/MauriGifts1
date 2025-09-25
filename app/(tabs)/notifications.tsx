import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CircleCheck as CheckCircle } from 'lucide-react-native';
import { useAppStore } from '@/state/store';
import { apiService } from '@/src/services/api';
import { useI18n } from '@/hooks/useI18n';
import { formatDate } from '@/src/utils/formatters';
import { showErrorToast } from '@/src/utils/toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';

export default function NotificationsScreen() {
  const { notifications, setNotifications, token } = useAppStore();
  const { t } = useI18n();
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [markingRead, setMarkingRead] = React.useState(false);

  const loadNotifications = async (isRefresh = false) => {
    if (!token) return;
    
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await apiService.getNotifications(token);
      if (response.data) {
        setNotifications(response.data.notifications);
      } else {
        showErrorToast(response.error || t('errors.generic'));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    
    setMarkingRead(true);
    try {
      const response = await apiService.getNotifications(token, true);
      if (response.data) {
        setNotifications(response.data.notifications);
      } else {
        showErrorToast(response.error || t('errors.generic'));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setMarkingRead(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [token]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'منذ قليل';
    } else if (diffHours < 24) {
      return `منذ ${diffHours} ساعة`;
    } else if (diffDays < 7) {
      return `منذ ${diffDays} أيام`;
    } else {
      return date.toLocaleDateString('ar-SA');
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('notifications.title')}</Text>
        </View>
        <ScrollView style={styles.content}>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={styles.notificationCard}>
              <Skeleton height={20} width={200} />
              <Skeleton height={16} width={150} style={styles.skeletonMargin} />
              <Skeleton height={14} width={100} />
            </Card>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Button
            title={t('notifications.mark_all_read')}
            size="small"
            variant="outline"
            onPress={markAllAsRead}
            loading={markingRead}
            disabled={notifications.every(n => n.seen)}
          />
          <Text style={styles.title}>{t('notifications.title')}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => loadNotifications(true)} 
          />
        }
      >
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell size={64} color="#9CA3AF" />}
            title={t('notifications.no_notifications')}
            subtitle="ستظهر الإشعارات هنا عند توفرها"
          />
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              style={[
                styles.notificationCard,
                !notification.seen && styles.unreadCard
              ]}
            >
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTime}>
                  {formatDate(notification.created_at)}
                </Text>
                {!notification.seen && (
                  <View style={styles.unreadDot} />
                )}
              </View>

              <Text style={styles.notificationTitle}>
                {notification.title}
              </Text>

              <Text style={styles.notificationBody}>
                {notification.body}
              </Text>

              {notification.payload?.delivery_code && (
                <View style={styles.codeContainer}>
                  <Text style={styles.codeLabel}>كود الشحن:</Text>
                  <Text style={styles.codeText}>
                    {notification.payload.delivery_code}
                  </Text>
                </View>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  notificationCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  unreadCard: {
    borderLeftColor: '#2563EB',
    backgroundColor: '#F8FAFC',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'right',
  },
  notificationBody: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    textAlign: 'right',
  },
  codeContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    textAlign: 'right',
  },
  codeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
    textAlign: 'center',
  },
  skeletonMargin: {
    marginVertical: 8,
  },
});