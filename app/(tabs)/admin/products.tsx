import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Plus, CreditCard as Edit, Trash2, X } from 'lucide-react-native';
import { useAppStore } from '../../../state/store';
import { api } from '../../../lib/api';
import { useI18n } from '../../../hooks/useI18n';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import EmptyState from '../../../components/ui/EmptyState';
import Skeleton from '../../../components/ui/Skeleton';
import { showSuccessToast, showErrorToast } from '../../../components/ui/Toast';

interface Product {
  id: string;
  category: 'pubg' | 'free_fire' | 'itunes' | 'psn';
  name: string;
  sku: string;
  price_mru: number;
  active: boolean;
  meta: any;
  created_at: string;
}

interface Settings {
  payment_number: string;
  app_name: string;
  app_version: string;
}

export default function AdminProductsScreen() {
  const { token } = useAppStore();
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings>({
    payment_number: '41791082',
    app_name: 'MauriGift',
    app_version: '1.0.0',
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: 'pubg' as const,
    name: '',
    title: '',
    sku: '',
    price_mru: '',
    active: true,
    amount: '',
    currency: '',
  });

  const loadData = async (isRefresh = false) => {
    if (!token) return;
    
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [productsResponse, settingsResponse] = await Promise.all([
        api.adminManageProducts(token, 'list'),
        api.adminManageSettings(token, 'get'),
      ]);

      if (productsResponse.data) {
        setProducts(productsResponse.data.products);
      }

      if (settingsResponse.data) {
        setSettings(settingsResponse.data.settings);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        category: product.category,
        name: product.name,
        title: product.meta?.title || '',
        sku: product.sku,
        price_mru: product.price_mru.toString(),
        active: product.active,
        amount: product.meta?.amount || '',
        currency: product.meta?.currency || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        category: 'pubg',
        name: '',
        title: '',
        sku: '',
        price_mru: '',
        active: true,
        amount: '',
        currency: '',
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingProduct(null);
    setFormData({
      category: 'pubg',
      name: '',
      title: '',
      sku: '',
      price_mru: '',
      active: true,
      amount: '',
      currency: '',
    });
  };

  const handleSaveProduct = async () => {
    if (!token || !formData.name || !formData.title || !formData.sku || !formData.price_mru) {
      showErrorToast('جميع الحقول مطلوبة');
      return;
    }

    const price = parseFloat(formData.price_mru);
    if (isNaN(price) || price <= 0) {
      showErrorToast('السعر يجب أن يكون رقم موجب');
      return;
    }

    setActionLoading(true);
    try {
      const productData = {
        category: formData.category,
        name: formData.name,
        sku: formData.sku,
        price_mru: price,
        active: formData.active,
        meta: {
          title: formData.title,
          amount: formData.amount,
          currency: formData.currency,
        },
        ...(editingProduct && { id: editingProduct.id }),
      };

      const response = await api.adminManageProducts(
        token,
        editingProduct ? 'update' : 'create',
        productData
      );

      if (response.data) {
        showSuccessToast(editingProduct ? 'تم تحديث المنتج' : 'تم إضافة المنتج');
        closeModal();
        loadData();
      } else {
        showErrorToast(response.error || 'خطأ في حفظ المنتج');
      }
    } catch (error) {
      console.error('Save product error:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'حذف المنتج',
      `هل أنت متأكد من حذف "${product.name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            
            try {
              const response = await api.adminManageProducts(token, 'delete', { id: product.id });
              if (response.data) {
                showSuccessToast('تم حذف المنتج');
                loadData();
              } else {
                showErrorToast(response.error || 'خطأ في حذف المنتج');
              }
            } catch (error) {
              showErrorToast(t('errors.network'));
            }
          },
        },
      ]
    );
  };

  const handleSaveSettings = async () => {
    if (!token) return;

    setActionLoading(true);
    try {
      const response = await api.adminManageSettings(token, 'update', settings);
      
      if (response.data) {
        showSuccessToast('تم حفظ الإعدادات');
        setSettingsModal(false);
      } else {
        showErrorToast(response.error || 'خطأ في حفظ الإعدادات');
      }
    } catch (error) {
      console.error('Save settings error:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && products.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>إدارة المنتجات</Text>
        </View>
        <ScrollView style={styles.content}>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={styles.productCard}>
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
        <View style={styles.headerRow}>
          <Button
            title="الإعدادات"
            size="small"
            variant="outline"
            onPress={() => setSettingsModal(true)}
          />
          <Button
            title="إضافة منتج"
            size="small"
            onPress={() => openProductModal()}
          />
        </View>
        <Text style={styles.title}>إدارة المنتجات</Text>
        <Text style={styles.subtitle}>
          المجموع: {products.length} منتج
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => loadData(true)} 
          />
        }
      >
        {products.length === 0 ? (
          <EmptyState
            icon={<Settings size={64} color="#9CA3AF" />}
            title="لا توجد منتجات"
            subtitle="ابدأ بإضافة منتجات جديدة"
            action={
              <Button
                title="إضافة منتج"
                onPress={() => openProductModal()}
              />
            }
          />
        ) : (
          products.map((product) => (
            <Card key={product.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={styles.productActions}>
                  <Button
                    title=""
                    size="small"
                    variant="outline"
                    onPress={() => handleDeleteProduct(product)}
                    style={styles.actionButton}
                  >
                    <Trash2 size={16} color="#DC2626" />
                  </Button>
                  <Button
                    title=""
                    size="small"
                    variant="outline"
                    onPress={() => openProductModal(product)}
                    style={styles.actionButton}
                  >
                    <Edit size={16} color="#2563EB" />
                  </Button>
                </View>
                <View style={[
                  styles.statusBadge,
                  product.active ? styles.activeBadge : styles.inactiveBadge
                ]}>
                  <Text style={[
                    styles.statusText,
                    product.active ? styles.activeText : styles.inactiveText
                  ]}>
                    {product.active ? 'نشط' : 'غير نشط'}
                  </Text>
                </View>
              </View>

              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productSku}>{product.sku}</Text>

              <View style={styles.productDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>
                    {t(`categories.${product.category}`)}
                  </Text>
                  <Text style={styles.detailLabel}>الفئة:</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>
                    {product.meta?.title || product.name}
                  </Text>
                  <Text style={styles.detailLabel}>العنوان:</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>
                    {product.price_mru} أوقية
                  </Text>
                  <Text style={styles.detailLabel}>السعر:</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>
                    {new Date(product.created_at).toLocaleDateString('ar-SA')}
                  </Text>
                  <Text style={styles.detailLabel}>تاريخ الإنشاء:</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Product Modal */}
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
              {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
            </Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <Card style={styles.modalCard}>
              <View style={styles.formRow}>
                <Text style={styles.formLabel}>الفئة</Text>
                <View style={styles.categoryButtons}>
                  {(['pubg', 'free_fire', 'itunes', 'psn'] as const).map((cat) => (
                    <Button
                      key={cat}
                      title={t(`categories.${cat}`)}
                      size="small"
                      variant={formData.category === cat ? 'primary' : 'outline'}
                      onPress={() => setFormData(prev => ({ ...prev, category: cat }))}
                      style={styles.categoryButton}
                    />
                  ))}
                </View>
              </View>

              <Input
                label="اسم المنتج"
                value={formData.name}
                onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
                placeholder="مثال: PUBG 60 UC"
              />

              <Input
                label="عنوان المنتج (يظهر للمستخدم)"
                value={formData.title}
                onChangeText={(value) => setFormData(prev => ({ ...prev, title: value }))}
                placeholder="مثال: 60 شدة"
              />

              <Input
                label="رمز المنتج (SKU)"
                value={formData.sku}
                onChangeText={(value) => setFormData(prev => ({ ...prev, sku: value }))}
                placeholder="مثال: PUBG-60"
              />

              <Input
                label="السعر (أوقية)"
                value={formData.price_mru}
                onChangeText={(value) => setFormData(prev => ({ ...prev, price_mru: value }))}
                placeholder="200"
                keyboardType="numeric"
              />

              <View style={styles.formRow}>
                <Text style={styles.formLabel}>تفاصيل إضافية</Text>
                <View style={styles.metaRow}>
                  <Input
                    label="الكمية"
                    value={formData.amount}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, amount: value }))}
                    placeholder="60"
                    containerStyle={styles.halfInput}
                    keyboardType="numeric"
                  />
                  <Input
                    label="العملة"
                    value={formData.currency}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                    placeholder="UC أو Diamonds"
                    containerStyle={styles.halfInput}
                  />
                </View>
              </View>
              <View style={styles.switchRow}>
                <Button
                  title={formData.active ? 'نشط' : 'غير نشط'}
                  size="small"
                  variant={formData.active ? 'primary' : 'outline'}
                  onPress={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                />
                <Text style={styles.switchLabel}>حالة المنتج:</Text>
              </View>

              <Button
                title={editingProduct ? 'تحديث المنتج' : 'إضافة المنتج'}
                onPress={handleSaveProduct}
                loading={actionLoading}
                disabled={!formData.name || !formData.title || !formData.sku || !formData.price_mru}
                style={styles.saveButton}
              />
            </Card>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={settingsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Button
              title="إلغاء"
              onPress={() => setSettingsModal(false)}
              variant="outline"
              size="small"
            />
            <Text style={styles.modalTitle}>إعدادات التطبيق</Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <Card style={styles.modalCard}>
              <Input
                label="رقم الدفع"
                value={settings.payment_number}
                onChangeText={(value) => setSettings(prev => ({ ...prev, payment_number: value }))}
                placeholder="41791082"
                keyboardType="phone-pad"
              />

              <Input
                label="اسم التطبيق"
                value={settings.app_name}
                onChangeText={(value) => setSettings(prev => ({ ...prev, app_name: value }))}
                placeholder="MauriGift"
              />

              <Input
                label="إصدار التطبيق"
                value={settings.app_version}
                onChangeText={(value) => setSettings(prev => ({ ...prev, app_version: value }))}
                placeholder="1.0.0"
              />

              <Button
                title="حفظ الإعدادات"
                onPress={handleSaveSettings}
                loading={actionLoading}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  content: {
    flex: 1,
    padding: 16,
  },
  productCard: {
    marginBottom: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productActions: {
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
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'right',
  },
  productSku: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    textAlign: 'right',
  },
  productDetails: {
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
  formRow: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'right',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    minWidth: '45%',
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
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  saveButton: {
    marginTop: 16,
  },
  skeletonMargin: {
    marginVertical: 8,
  },
});