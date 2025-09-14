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
import { useAppStore } from '../../state/store';
import { api } from '../../lib/api';
import { useI18n } from '../../hooks/useI18n';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import { showErrorToast } from '../../components/ui/Toast';

const CATEGORY_IMAGES = {
  pubg: 'https://i.postimg.cc/cLvssbLj/OIP-2.webp',
  free_fire: 'https://i.postimg.cc/C52QJmpB/OIP-3.webp',
  itunes: 'https://i.postimg.cc/QMqYvXrr/R.jpg',
  psn: 'https://i.postimg.cc/bJW59mhG/OIP-4.webp',
};

export default function HomeScreen() {
  const { products, setProducts, user } = useAppStore();
  const { t } = useI18n();
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadProducts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.getProducts();
      if (response.data) {
        setProducts(response.data.products);
      } else {
        showErrorToast(response.error || t('errors.generic'));
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

  const handleCategoryPress = (category: string) => {
    router.push(`/category/${category}`);
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
          {Object.entries(CATEGORY_IMAGES).map(([category, imageUrl]) => (
            <Card
              key={category}
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(category)}
            >
              <Image
                source={{ uri: imageUrl }}
                style={styles.categoryImage}
                resizeMode="cover"
              />
              <View style={styles.cardContent}>
                <Text style={styles.categoryTitle}>
                  {t(`categories.${category}`)}
                </Text>
                <Text style={styles.productCount}>
                  {products[category]?.length || 0} منتج
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