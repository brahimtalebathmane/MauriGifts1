import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/state/store';
import { apiService } from '../../src/services/api';
import { useI18n } from '@/hooks/useI18n';
import type { Category } from '../../src/types';
import { showErrorToast } from '../../src/utils/toast';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

export default function HomeScreen() {
  const { products, setProducts, categories, setCategories, user, refreshData } = useAppStore();
  const { t } = useI18n();
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadProducts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [productsResponse, categoriesResponse] = await Promise.all([
        apiService.getProducts(),
        apiService.getCategories(),
      ]);
      
      if (productsResponse.data) {
        setProducts(productsResponse.data.products || {});
      }
      
      if (categoriesResponse.data) {
        const categoriesData = categoriesResponse.data.categories || [];
        setCategories(categoriesData);
      }
      
      if (productsResponse.error) {
        showErrorToast(productsResponse.error || t('errors.generic'));
      }
    } catch (error) {
      console.error('Error loading products:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCategoryPress = (categoryName: string) => {
    const categoryProducts = products[categoryName];
    if (!categoryProducts || categoryProducts.length === 0) {
      // Still allow navigation even if no products, they might be added later
      console.log('No products found for category:', categoryName);
    }
    router.push(`/category/${encodeURIComponent(categoryName)}`);
  };

  if (loading && Object.keys(products).length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Skeleton height={32} width={200} />
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.grid}>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} style={styles.categoryCard}>
                <Skeleton height={120} />
                <View style={styles.cardContent}>
                  <Skeleton height={20} width={100} />
                </View>
              </Card>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t('home.welcome')} {user?.name}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadProducts(true)} />
        }
      >
        <Text style={styles.sectionTitle}>{t('home.categories')}</Text>
        
        <View style={styles.grid}>
          {categories.map((category) => (
            <Card
              key={category.id || category.name}
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(category.name)}
            >
              <Image
                source={{ uri: category.image_url || 'https://via.placeholder.com/300x200' }}
                style={styles.categoryImage}
                resizeMode="cover"
              />
              <View style={styles.cardContent}>
                <Text style={styles.categoryTitle}>
                  {category.name}
                </Text>
                <Text style={styles.productCount}>
                  {products[category.name]?.length || 0} منتج
                </Text>
              </View>
            </Card>
          ))}
        </View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'right',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'right',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    marginBottom: 16,
    padding: 0,
  },
  categoryImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardContent: {
    padding: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'right',
  },
  productCount: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'right',
  },
});