import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClipboardList, Eye, X } from 'lucide-react-native';
import { useAppStore } from '@/state/store';
import { apiService } from '../../../src/services/api';
import { useI18n } from '@/hooks/useI18n';
import type { AdminOrder } from '../../../src/types';
import { formatPhoneNumber } from '../../../src/utils/formatters';
import { showSuccessToast, showErrorToast } from '../../../src/utils/toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import StatusChip from '../../../src/components/common/StatusChip';
import Skeleton from '@/components/ui/Skeleton';

export default function AdminOrdersScreen() {
  const { token } = useAppStore();
  const { t } = useI18n();
  const [orders, setOrders] = React.useState<AdminOrder[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedOrder, setSelectedOrder] = React.useState<AdminOrder | null>(null);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [receiptModal, setReceiptModal] = React.useState(false);
  const [deliveryCode, setDeliveryCode] = React.useState('');
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [actionLoading, setActionLoading] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState<string>('');

  const loadOrders = async (isRefresh = false) => {
    if (!token) return;
    
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await apiService.adminListOrders(token, filterStatus || undefined);
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
  }, [token, filterStatus]);

  const handleApproveOrder = async () => {
    if (!selectedOrder || !deliveryCode.trim() || !token) return;

    if (selectedOrder.status !== 'under_review') {
      showErrorToast('يمكن تأكيد الطلبات قيد المراجعة فقط');
      return;
    }

    setActionLoading(true);
    try {
      const response = await apiService.adminApproveOrder(token, selectedOrder.id, deliveryCode.trim());
      if (response.data) {
        showSuccessToast('تم تأكيد الطلب بنجاح');
        closeModal();
        loadOrders();
      } else {
        showErrorToast(response.error || t('errors.generic'));
      }
    } catch (error) {
      console.error('Error approving order:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!selectedOrder || !rejectionReason.trim() || !token) return;

    if (selectedOrder.status !== 'under_review') {
      showErrorToast('يمكن رفض الطلبات قيد المراجعة فقط');
      return;
    }

    setActionLoading(true);
    try {
      const response = await apiService.adminRejectOrder(token, selectedOrder.id, rejectionReason.trim());
      if (response.data) {
        showSuccessToast('تم رفض الطلب');
        closeModal();
        loadOrders();
      } else {
        showErrorToast(response.error || t('errors.generic'));
      }
    } catch (error) {
      console.error('Error rejecting order:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setActionLoading(false);
    }
  };

  const openOrderModal = (order: AdminOrder) => {
    setSelectedOrder(order);
    setDeliveryCode(order.delivery_code || '');
    setRejectionReason(order.admin_note || '');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedOrder(null);
    setDeliveryCode('');
    setRejectionReason('');
  };

  const viewReceipt = (order: AdminOrder) => {
    if (order.receipt_path) {
      setSelectedOrder(order);
      setReceiptModal(true);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3-$4');
  };

  const statusOptions = [
    { value: '', label: t('admin.all_statuses') },
    { value: 'under_review', label: t('order_status.under_review') },
    { value: 'completed', label: t('order_status.completed') },
    { value: 'rejected', label: t('order_status.rejected') },
  ];

  if (loading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('admin.orders')}</Text>
        </View>
        <ScrollView style={styles.content}>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={styles.orderCard}>
              <Skeleton height={20} width={150} />
              <Skeleton height={16} width={120} style={styles.skeletonMargin} />
              <Skeleton height={16} width={100} />
            </Card>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('admin.orders')}</Text>
        <Text style={styles.subtitle}>
          المجموع: {orders.length} طلب
        </Text>
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              title={option.label}
              size="small"
              variant={filterStatus === option.value ? 'primary' : 'outline'}
              onPress={() => setFilterStatus(option.value)}
              style={styles.filterButton}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => loadOrders(true)} 
          />
        }
      >
        {orders.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={64} color="#9CA3AF" />}
            title="لا توجد طلبات"
            subtitle="لا توجد طلبات في هذا الفلتر"
          />
        ) : (
          orders.map((order) => (
            <Card 
              key={order.id} 
              style={styles.orderCard}
              onPress={() => openOrderModal(order)}
            >
              <View style={styles.orderHeader}>
                <StatusChip status={order.status} />
                <Text style={styles.orderDate}>
                  {new Date(order.created_at).toLocaleDateString('ar-SA')}
                </Text>
              </View>

              <View style={styles.productHeader}>
                <Text style={styles.productName}>
                  {order.products.name}
                </Text>
                {order.products.categories && (
                  <Text style={styles.categoryBadge}>
                    {order.products.categories.name}
                  </Text>
                )}
              </View>

              <View style={styles.orderDetails}>
                <Text style={styles.customerName}>
                  {order.users.name} - {formatPhoneNumber(order.users.phone_number)}
                </Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>
                    {order.products.price_mru} أوقية
                  </Text>
                  <Text style={styles.detailLabel}>السعر:</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>
                    {t(`payment_methods.${order.payment_method}`)}
                  </Text>
                  <Text style={styles.detailLabel}>طريقة الدفع:</Text>
                </View>

                {order.payment_number && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailValue}>
                      {order.payment_number}
                    </Text>
                    <Text style={styles.detailLabel}>رقم الدفع:</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>
                    {order.products.sku}
                  </Text>
                  <Text style={styles.detailLabel}>رمز المنتج:</Text>
                </View>

                {order.receipt_path ? (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailValue, styles.hasReceiptText]}>
                      ✓ تم الرفع
                    </Text>
                    <Text style={styles.detailLabel}>الإيصال:</Text>
                  </View>
                ) : (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailValue, styles.noReceiptTextSmall]}>
                      ✗ لم يُرفع
                    </Text>
                    <Text style={styles.detailLabel}>الإيصال:</Text>
                  </View>
                )}
              </View>

              <View style={styles.actions}>
                {order.receipt_path && (
                  <Button
                    title="عرض الإيصال"
                    size="small"
                    variant="outline"
                    onPress={() => viewReceipt(order)}
                    style={styles.actionButton}
                  />
                )}
                <Button
                  title="عرض التفاصيل"
                  size="small"
                  variant="outline"
                  onPress={() => openOrderModal(order)}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Order Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Button
              title="إغلاق"
              onPress={closeModal}
              variant="outline"
              size="small"
            />
            <Text style={styles.modalTitle}>تفاصيل الطلب</Text>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedOrder && (
              <>
                <Card style={styles.modalCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>معلومات الطلب</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoValue}>{selectedOrder.id.slice(0, 8)}...</Text>
                    <Text style={styles.infoLabel}>رقم الطلب:</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <StatusChip status={selectedOrder.status} />
                    <Text style={styles.infoLabel}>الحالة:</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoValue}>
                      {new Date(selectedOrder.created_at).toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                    <Text style={styles.infoLabel}>تاريخ الطلب:</Text>
                  </View>
                </Card>

                <Card style={styles.modalCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>معلومات المستخدم</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoValue}>{selectedOrder.users.name}</Text>
                    <Text style={styles.infoLabel}>الاسم:</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoValue}>{formatPhoneNumber(selectedOrder.users.phone_number)}</Text>
                    <Text style={styles.infoLabel}>رقم الهاتف:</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoValue}>
                      {new Date(selectedOrder.users.created_at).toLocaleDateString('ar-SA')}
                    </Text>
                    <Text style={styles.infoLabel}>عضو منذ:</Text>
                  </View>
                </Card>

                <Card style={styles.modalCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>تفاصيل المنتج</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoValue}>{selectedOrder.products.name}</Text>
                    <Text style={styles.infoLabel}>اسم المنتج:</Text>
                  </View>
                  {selectedOrder.products.categories && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoValue}>{selectedOrder.products.categories.name}</Text>
                      <Text style={styles.infoLabel}>الفئة:</Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoValue}>{selectedOrder.products.sku}</Text>
                    <Text style={styles.infoLabel}>رمز المنتج:</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoPriceValue}>{selectedOrder.products.price_mru} أوقية</Text>
                    <Text style={styles.infoLabel}>السعر:</Text>
                  </View>
                  {selectedOrder.products.meta?.title && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoValue}>{selectedOrder.products.meta.title}</Text>
                      <Text style={styles.infoLabel}>العنوان:</Text>
                    </View>
                  )}
                  {selectedOrder.products.meta?.amount && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoValue}>{selectedOrder.products.meta.amount}</Text>
                      <Text style={styles.infoLabel}>الكمية:</Text>
                    </View>
                  )}
                </Card>

                <Card style={styles.modalCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>تفاصيل الدفع</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoValue}>
                      {t(`payment_methods.${selectedOrder.payment_method}`)}
                    </Text>
                    <Text style={styles.infoLabel}>طريقة الدفع:</Text>
                  </View>
                  {selectedOrder.payment_number && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoValue}>{selectedOrder.payment_number}</Text>
                      <Text style={styles.infoLabel}>رقم الدفع:</Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoPriceValue}>{selectedOrder.products.price_mru} أوقية</Text>
                    <Text style={styles.infoLabel}>المبلغ المطلوب:</Text>
                  </View>
                </Card>

                {selectedOrder.receipt_path && (
                  <Card style={styles.modalCard}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>إيصال الدفع</Text>
                    </View>
                    <View style={styles.receiptPreviewContainer}>
                      <Image
                        source={{
                          uri: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/receipts/${selectedOrder.receipt_path}`
                        }}
                        style={styles.receiptPreview}
                        resizeMode="cover"
                      />
                      <Button
                        title="عرض بالحجم الكامل"
                        variant="outline"
                        onPress={() => viewReceipt(selectedOrder)}
                        style={styles.viewFullButton}
                      />
                    </View>
                  </Card>
                )}

                {!selectedOrder.receipt_path && (
                  <Card style={styles.modalCard}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>إيصال الدفع</Text>
                    </View>
                    <View style={styles.noReceiptContainer}>
                      <Text style={styles.noReceiptText}>لم يتم رفع إيصال بعد</Text>
                    </View>
                  </Card>
                )}

                {selectedOrder.status === 'under_review' && (
                  <Card style={styles.modalCard}>
                    <Text style={styles.sectionTitle}>إجراءات</Text>
                    
                    <Input
                      label={t('admin.delivery_code')}
                      value={deliveryCode}
                      onChangeText={setDeliveryCode}
                      placeholder={t('admin.enter_code')}
                    />
                    
                    <View style={styles.actionButtons}>
                      <Button
                        title={t('admin.approve')}
                        onPress={handleApproveOrder}
                        loading={actionLoading}
                        disabled={!deliveryCode.trim()}
                        style={styles.actionButton}
                      />
                    </View>

                    <Input
                      label={t('admin.rejection_reason')}
                      value={rejectionReason}
                      onChangeText={setRejectionReason}
                      placeholder={t('admin.enter_reason')}
                      multiline
                    />
                    
                    <Button
                      title={t('admin.reject')}
                      variant="danger"
                      onPress={handleRejectOrder}
                      loading={actionLoading}
                      disabled={!rejectionReason.trim()}
                    />
                  </Card>
                )}

                {selectedOrder.delivery_code && (
                  <Card style={styles.modalCard}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>كود التسليم</Text>
                    </View>
                    <Text style={styles.deliveryCode}>
                      {selectedOrder.delivery_code}
                    </Text>
                  </Card>
                )}

                {selectedOrder.admin_note && (
                  <Card style={styles.modalCard}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>ملاحظة الإدارة</Text>
                    </View>
                    <Text style={styles.adminNote}>
                      {selectedOrder.admin_note}
                    </Text>
                  </Card>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        visible={receiptModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.receiptModalContainer}>
          <View style={styles.receiptModalContent}>
            <View style={styles.receiptHeader}>
              <Button
                title=""
                onPress={() => setReceiptModal(false)}
                variant="outline"
                size="small"
                style={styles.closeButton}
              >
                <X size={20} color="#374151" />
              </Button>
              <Text style={styles.receiptTitle}>إيصال الدفع</Text>
            </View>
            
            {selectedOrder?.receipt_path && (
              <Image
                source={{ 
                  uri: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/receipts/${selectedOrder.receipt_path}` 
                }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    marginRight: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  orderCard: {
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
    flex: 1,
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  hasReceiptText: {
    color: '#059669',
    fontWeight: '600',
  },
  noReceiptTextSmall: {
    color: '#DC2626',
    fontWeight: '600',
  },
  orderDetails: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'right',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    marginBottom: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
    marginRight: 16,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalCard: {
    marginBottom: 16,
  },
  modalProductName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginVertical: 8,
    textAlign: 'right',
  },
  modalCustomer: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'right',
  },
  sectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'right',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    flex: 0.4,
    textAlign: 'right',
  },
  infoValue: {
    fontSize: 14,
    color: '#374151',
    flex: 0.6,
    textAlign: 'left',
  },
  infoPriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
    flex: 0.6,
    textAlign: 'left',
  },
  receiptPreviewContainer: {
    alignItems: 'center',
  },
  receiptPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  viewFullButton: {
    width: '100%',
  },
  noReceiptContainer: {
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  noReceiptText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  actionButtons: {
    marginBottom: 16,
  },
  deliveryCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
  },
  adminNote: {
    fontSize: 16,
    color: '#991B1B',
    textAlign: 'right',
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  receiptModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 0,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
    marginRight: 12,
  },
  receiptImage: {
    width: '100%',
    height: 400,
  },
  skeletonMargin: {
    marginVertical: 8,
  },
});