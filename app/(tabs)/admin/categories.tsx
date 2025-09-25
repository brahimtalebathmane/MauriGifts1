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
import { FolderOpen, Plus, CreditCard as Edit, Trash2, X } from 'lucide-react-native';
import { useAppStore } from '@/state/store';
import { apiService } from '../../../src/services/api';
import { useI18n } from '@/hooks/useI18n';
import type { Category } from '@/src/types';
import { showSuccessToast, showErrorToast } from '../../../src/utils/toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';

export default function AdminCategoriesScreen() {
  const { token } = useAppStore();
  const { t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
  });

  const loadCategories = async (isRefresh = false) => {
    if (!token) return;
    
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await apiService.adminManageCategories(token, 'list');
      if (response.data) {
        setCategories(response.data.categories || []);
      } else {
        showErrorToast(response.error || t('errors.generic'));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [token]);

  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        image_url: category.image_url || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        image_url: '',
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      image_url: '',
    });
  };

  const handleSaveCategory = async () => {
    if (!token || !formData.name.trim()) {
      showErrorToast('اسم الفئة مطلوب');
      return;
    }

    setActionLoading(true);
    try {
      const categoryData: any = {
        name: formData.name.trim(),
        image_url: formData.image_url.trim() || null,
      };

      if (editingCategory) {
        categoryData.id = editingCategory.id;
      }

      const response = await apiService.adminManageCategories(
        token,
        editingCategory ? 'update' : 'create',
        categoryData
      );

      if (response.data) {
        showSuccessToast(editingCategory ? 'تم تحديث الفئة' : 'تم إضافة الفئة');
        closeModal();
        loadCategories();
      } else {
        showErrorToast(response.error || 'خطأ في حفظ الفئة');
      }
    } catch (error) {
      console.error('Save category error:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      'حذف الفئة',
      `هل أنت متأكد من حذف "${category.name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            
            try {
              const response = await apiService.adminManageCategories(token, 'delete', { id: category.id });
              if (response.data) {
                showSuccessToast('تم حذف الفئة');
                loadCategories();
              } else {
                showErrorToast(response.error || 'خطأ في حذف الفئة');
              }
            } catch (error) {
              showErrorToast(t('errors.network'));
            }
          },
        },
      ]
    );
  };

  if (loading && categories.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>إدارة الفئات</Text>
        </View>
        <ScrollView style={styles.content}>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={styles.categoryCard}>
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
          title="إضافة فئة"
          size="small"
          onPress={() => openCategoryModal()}
        />
        <Text style={styles.title}>إدارة الفئات</Text>
        <Text style={styles.subtitle}>
          المجموع: {categories.length} فئة
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => loadCategories(true)} 
          />
        }
      >
        {categories.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={64} color="#9CA3AF" />}
            title="لا توجد فئات"
            subtitle="ابدأ بإضافة فئات جديدة"
            action={
              <Button
                title="إضافة فئة"
                onPress={() => openCategoryModal()}
              />
            }
          />
        ) : (
          categories.map((category) => (
            <Card key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryActions}>
                  <Button
                    title=""
                    size="small"
                    variant="outline"
                    onPress={() => handleDeleteCategory(category)}
                    style={styles.actionButton}
                  >
                    <Trash2 size={16} color="#DC2626" />
                  </Button>
                  <Button
                    title=""
                    size="small"
                    variant="outline"
                    onPress={() => openCategoryModal(category)}
                    style={styles.actionButton}
                  >
                    <Edit size={16} color="#2563EB" />
                  </Button>
                </View>
              </View>

              {category.image_url && (
                <Image
                  source={{ uri: category.image_url }}
                  style={styles.categoryImage}
                  resizeMode="cover"
                />
              )}

              <Text style={styles.categoryName}>{category.name}</Text>

              <View style={styles.categoryDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>
                    {new Date(category.created_at).toLocaleDateString('ar-SA')}
                  </Text>
                  <Text style={styles.detailLabel}>تاريخ الإنشاء:</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Category Modal */}
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
              {editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
            </Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <Card style={styles.modalCard}>
              <Input
                label="اسم الفئة"
                value={formData.name}
                onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
                placeholder="مثال: ألعاب الهاتف"
              />

              <Input
                label="رابط الصورة"
                value={formData.image_url}
                onChangeText={(value) => setFormData(prev => ({ ...prev, image_url: value }))}
                placeholder="https://example.com/image.jpg"
              />

              <Button
                title={editingCategory ? 'تحديث الفئة' : 'إضافة الفئة'}
                onPress={handleSaveCategory}
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
  categoryCard: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 0,
  },
  categoryImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'right',
  },
  categoryDetails: {
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
  saveButton: {
    marginTop: 16,
  },
  skeletonMargin: {
    marginVertical: 8,
  },
});