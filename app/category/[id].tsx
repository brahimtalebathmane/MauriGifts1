import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import { useAppStore } from '@/state/store';
import { useI18n } from '@/hooks/useI18n';
import type { Category, Product } from '../../src/types';
import { showErrorToast } from '../../src/utils/toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams();
  const { products, categories, refreshData } = useAppStore();
  const { t } = useI18n();
  
  // Decode the category name from URL
  const decodedId = decodeURIComponent(id as string);
  
  // Find category from store
  const category = categories.find((cat: Category) => 
    cat.name === decodedId || cat.id === decodedId
  ) || null;
  
  // Try to find products by category name first, then by ID
  let categoryProducts: Product[] = [];
  
  if (products[decodedId]) {
    categoryProducts = products[decodedId];
  } else if (category?.id && products[category.id]) {
    categoryProducts = products[category.id];
  }
  
  console.log(`Category: ${decodedId}, Products found: ${categoryProducts.length}`);
  console.log('Available product groups:', Object.keys(products));

  useEffect(() => {
    // Refresh data when category page loads to ensure latest products
    refreshData();
  }, [decodedId, refreshData]);

  const handleProductSelect = (product: Product) => {
    if (!product.active) {
      showErrorToast('هذا المنتج غير متوفر حالياً');
      return;
    }

    router.push({
      pathname: '/payment',
      params: { 
        productId: product.id, 
        productName: product.name,
        productPrice: product.price_mru.toString(),
        productCategory: category?.name || decodedId
      }
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-SA').format(price);
  };

  const getProductAmount = (product: Product) => {
    const meta = product.meta;
    if (meta?.title) {
      return meta.title;
    }
    if (meta?.amount && meta?.currency) {
      return `${meta.amount} ${meta.currency === 'UC' ? t('products.uc') : 
        meta.currency === 'Diamonds' ? t('products.diamonds') : meta.currency}`;
    }
    return product.name;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button
          title=""
          onPress={() => router.back()}
          variant="outline"
          size="small"
          style={styles.backButton}
        >
          <ArrowRight size={20} color="#374151" />
        </Button>
        <Text style={styles.title}>
          {category?.name || decodedId}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {category?.image_url && (
          <Image
            source={{ uri: category.image_url }}
            style={styles.categoryImage}
            resizeMode="cover"
          />
        )}

        <Text style={styles.sectionTitle}>
          {t('products.select_amount')}
        </Text>

        {categoryProducts.length === 0 ? (
          <EmptyState
            title="لا توجد منتجات"
            subtitle="لا توجد منتجات متاحة في هذه الفئة حالياً"
          />
        ) : (
          categoryProducts.map((product) => (
            <Card
              key={product.id}
              style={styles.productCard}
              onPress={() => handleProductSelect(product)}
            >
              <View style={styles.productInfo}>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>{t('products.price')}</Text>
                  <Text style={styles.price}>
                    {formatPrice(product.price_mru)} {t('products.mru')}
                  </Text>
                </View>
                <View style={styles.productDetails}>
                  <Text style={styles.productName}>
                    {getProductAmount(product)}
                  </Text>
                  <Text style={styles.productSku}>
                    {product.sku}
                  </Text>
                </View>
              </View>
              
              <View style={styles.buyButton}>
                <Button
                  title={t('products.buy_now')}
                  size="small"
                  onPress={() => handleProductSelect(product)}
                />
              </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
    marginRight: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  categoryImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'right',
  },
  productCard: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    flexDirection: 'row',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'right',
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginLeft: 16,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  buyButton: {
    marginLeft: 12,
  },
});