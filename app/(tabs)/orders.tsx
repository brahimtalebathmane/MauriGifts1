import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/state/store';
import { apiService } from '../../src/services/api';
import { useI18n } from '@/hooks/useI18n';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '../../src/components/common/StatusChip';
import Skeleton from '@/components/ui/Skeleton';
import { showSuccessToast, showErrorToast } from '../../src/utils/toast';

export default function OrdersScreen() {
  const { orders, setOrders, token } = useAppStore();
  const { t } = useI18n();
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadOrders = async (isRefresh = false) => {
    if (!token) return;
    
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await apiService.getMyOrders(token);
      if (response.data) {
        setOrders(response.data.orders);
      } else {
        showErrorToast(response.error || t('errors.generic'));
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [token]);

  const handleCopyCode = async (code: string) => {
    if (!code) {
      showErrorToast('لا يوجد كود للنسخ');
      return;
    }

    await Clipboard.setStringAsync(code);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    showSuccessToast(t('orders.code_copied'));
  };

  if (loading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('orders.my_orders')}</Text>
        </View>
        <ScrollView style={styles.content}>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={styles.orderCard}>
              <Skeleton height={20} width={150} />
              <View style={styles.skeletonRow}>
                <Skeleton height={16} width={100} />
                <Skeleton height={16} width={80} />
              </View>
              <Skeleton height={16} width={120} />
            </Card>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('orders.my_orders')}</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadOrders(true)} />
        }
      >
        {orders.length === 0 ? (
          <EmptyState
            title={t('orders.no_orders')}
            subtitle="لم تقم بأي طلبات بعد"
          />
        ) : (
          orders.map((order) => (
            <Card key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <StatusChip status={order.status} />
                <Text style={styles.orderDate}>
                  {new Date(order.created_at).toLocaleDateString('ar-SA')}
                </Text>
              </View>

              <Text style={styles.productName}>
                {order.products?.name}
              </Text>

              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('orders.payment_method')}:</Text>
                  <Text style={styles.detailValue}>
                    {t(`payment_methods.${order.payment_method}`)}
                  </Text>
                </View>

                {order.payment_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('orders.payment_number')}:</Text>
                    <Text style={styles.detailValue}>{order.payment_number}</Text>
                  </View>
                )}

                {order.products && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('products.price')}:</Text>
                    <Text style={styles.detailValue}>
                      {order.products.price_mru} {t('products.mru')}
                    </Text>
                  </View>
                )}
              </View>

              {order.status === 'completed' && order.delivery_code && (
                <View style={styles.codeContainer}>
                  <Text style={styles.codeLabel}>{t('orders.delivery_code')}:</Text>
                  <View style={styles.codeRow}>
                    <Button
                      title={t('orders.copy_code')}
                      size="small"
                      variant="outline"
                      onPress={() => handleCopyCode(order.delivery_code!)}
                    />
                    <Text style={styles.codeText}>{order.delivery_code}</Text>
                  </View>
                </View>
              )}

              {order.status === 'rejected' && order.admin_note && (
                <View style={styles.noteContainer}>
                  <Text style={styles.noteLabel}>{t('orders.admin_note')}:</Text>
                  <Text style={styles.noteText}>{order.admin_note}</Text>
                </View>
              )}

              {order.status === 'under_review' && (
                <View style={styles.reviewNote}>
                  <Text style={styles.reviewText}>
                    {t('payment.under_review')}
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
    backgroundColor: '#0f0f16',
  },
  header: {
    padding: 20,
    backgroundColor: '#0f0f16',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a35',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f3f3f4',
    textAlign: 'right',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  orderCard: {
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderDate: {
    fontSize: 14,
    color: '#9a9aa5',
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f3f4',
    marginBottom: 12,
    textAlign: 'right',
  },
  orderDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#9a9aa5',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f3f3f4',
  },
  codeContainer: {
    backgroundColor: '#1a1a25',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f3f3f4',
    marginBottom: 8,
    textAlign: 'right',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
    flex: 1,
    textAlign: 'center',
  },
  noteContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
    textAlign: 'right',
  },
  noteText: {
    fontSize: 14,
    color: '#991B1B',
    textAlign: 'right',
  },
  reviewNote: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
});