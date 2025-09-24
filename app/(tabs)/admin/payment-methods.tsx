import React, { useEffect, useState } from 'react';
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
import { CreditCard, Plus, Edit, Trash2 } from 'lucide-react-native';
import { useAppStore } from '@/state/store';
import { apiService as api } from '@/src/services/api';
import { useI18n } from '@/hooks/useI18n';
import { PaymentMethodDB } from '@/src/types';
import { showSuccessToast, showErrorToast } from '@/src/utils/toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';

export default function AdminPaymentMethodsScreen() {
  const { token } = useAppStore();
  const { t } = useI18n();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDB[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodDB | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    status: 'active' as 'active' | 'inactive',
  });

  const loadPaymentMethods = async (isRefresh = false) => {
    if (!token) return;
    
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.adminManagePaymentMethods(token, 'list');
      if (response.data) {
        setPaymentMethods(response.data.payment_methods || []);
      } else {
        showErrorToast(response.error || t('errors.generic'));
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPaymentMethods();
  }, [token]);

  const openMethodModal = (method?: PaymentMethodDB) => {
    if (method) {
      setEditingMethod(method);
      setFormData({
        name: method.name,
        logo_url: method.logo_url || '',
        status: method.status,
      });
    } else {
      setEditingMethod(null);
      setFormData({
        name: '',
        logo_url: '',
        status: 'active',
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingMethod(null);
    setFormData({
      name: '',
      logo_url: '',
      status: 'active',
    });
  };

  const handleSaveMethod = async () => {
    if (!token || !formData.name.trim()) {
      showErrorToast('اسم طريقة الدفع مطلوب');
      return;
    }

    setActionLoading(true);
    try {
      const methodData = {
        name: formData.name.trim(),
        logo_url: formData.logo_url.trim() || null,
        status: formData.status,
        ...(editingMethod && { id: editingMethod.id }),
      };

      const response = await api.adminManagePaymentMethods(
        token,
        editingMethod ? 'update' : 'create',
        methodData
      );

      if (response.data) {
        showSuccessToast(editingMethod ? 'تم تحديث طريقة الدفع' : 'تم إضافة طريقة الدفع');
        closeModal();
        loadPaymentMethods();
      } else {
        showErrorToast(response.error || 'خطأ في حفظ طريقة الدفع');
      }
    } catch (error) {
      console.error('Save payment method error:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMethod = (method: PaymentMethodDB) => {
    Alert.alert(
      'حذف طريقة الدفع',
      `هل أنت متأكد من حذف "${method.name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            
            try {
              const response = await api.adminManagePaymentMethods(token, 'delete', { id: method.id });
              if (response.data) {
                showSuccessToast('تم حذف طريقة الدفع');
                loadPaymentMethods();
              } else {
                showErrorToast(response.error || 'خطأ في حذف طريقة الدفع');
              }
            } catch (error) {
              showErrorToast(t('errors.network'));
            }
          },
        },
      ]
    );
  };

  if (loading && paymentMethods.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>إدارة طرق الدفع</Text>
        </View>
        <ScrollView style={styles.content}>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={styles.methodCard}>
              <Skeleton height={20} width={150} />
              <Skeleton height={16} width={120} style={styles.skeletonMargin} />
            </Card>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button
          title="إضافة طريقة دفع"
          size="small"
          onPress={() => openMethodModal()}
        />
        <Text style={styles.title}>إدارة طرق الدفع</Text>
        <Text style={styles.subtitle}>
          المجموع: {paymentMethods.length} طريقة
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => loadPaymentMethods(true)} 
          />
        }
      >
        {paymentMethods.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={64} color="#9CA3AF" />}
            title="لا توجد طرق دفع"
            subtitle="ابدأ بإضافة طرق دفع جديدة"
            action={
              <Button
                title="إضافة طريقة دفع"
                onPress={() => openMethodModal()}
              />
            }
          />
        ) : (
          paymentMethods.map((method) => (
            <Card key={method.id} style={styles.methodCard}>
              <View style={styles.methodHeader}>
                <View style={styles.methodActions}>
                  <Button
                    title=""
                    size="small"
                    variant="outline"
                    onPress={() => handleDeleteMethod(method)}
                    style={styles.actionButton}
                  >
                    <Trash2 size={16} color="#DC2626" />
                  </Button>
                  <Button
                    title=""
                    size="small"
                    variant="outline"
                    onPress={() => openMethodModal(method)}
                    style={styles.actionButton}
                  >
                    <Edit size={16} color="#2563EB" />
                  </Button>
                </View>
                <View style={[
                  styles.statusBadge,
                  method.status === 'active' ? styles.activeBadge : styles.inactiveBadge
                ]}>
                  <Text style={[
                    styles.statusText,
                    method.status === 'active' ? styles.activeText : styles.inactiveText
                  ]}>
                    {method.status === 'active' ? 'نشط' : 'غير نشط'}
                  </Text>
                </View>
              </View>

              {method.logo_url && (
                <Image
                  source={{ uri: method.logo_url }}
                  style={styles.methodLogo}
                  resizeMode="contain"
                />
              )}

              <Text style={styles.methodName}>{method.name}</Text>

              <View style={styles.methodDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>
                    {new Date(method.created_at).toLocaleDateString('ar-SA')}
                  </Text>
                  <Text style={styles.detailLabel}>تاريخ الإنشاء:</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Payment Method Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Button
              title="إلغاء"
              onPress={closeModal}
              variant="outline"
              size="small"
            />
            <Text style={styles.modalTitle}>
              {editingMethod ? 'تعديل طريقة الدفع' : 'إضافة طريقة دفع جديدة'}
            </Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <Card style={styles.modalCard}>
              <Input
                label="اسم طريقة الدفع"
                value={formData.name}
                onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
                placeholder="مثال: بنكيلي"
              />

              <Input
                label="رابط الشعار"
                value={formData.logo_url}
                onChangeText={(value) => setFormData(prev => ({ ...prev, logo_url: value }))}
                placeholder="https://example.com/logo.png"
              />

              <View style={styles.switchRow}>
                <Button
                  title={formData.status === 'active' ? 'نشط' : 'غير نشط'}
                  size="small"
                  variant={formData.status === 'active' ? 'primary' : 'outline'}
                  onPress={() => setFormData(prev => ({ 
                    ...prev, 
                    status: prev.status === 'active' ? 'inactive' : 'active' 
                  }))}
                />
                <Text style={styles.switchLabel}>حالة طريقة الدفع:</Text>
              </View>

              <Button
                title={editingMethod ? 'تحديث طريقة الدفع' : 'إضافة طريقة الدفع'}
                onPress={handleSaveMethod}
                loading={actionLoading}
                disabled={!formData.name.trim()}
                style={styles.saveButton}
              />
            </Card>
          </ScrollView>
        </SafeAreaView>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'right',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  methodCard: {
    marginBottom: 12,
  },
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 0,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: '#065F46',
  },
  inactiveText: {
    color: '#991B1B',
  },
  methodLogo: {
    width: '100%',
    height: 80,
    marginBottom: 12,
  },
  methodName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'right',
  },
  methodDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    marginTop: 16,
  },
  skeletonMargin: {
    marginVertical: 8,
  },
});