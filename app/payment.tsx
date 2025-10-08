import React, { useState } from 'react';
import { useEffect } from 'react';
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
import { apiService } from '../src/services/api';
import { useI18n } from '@/hooks/useI18n';
import type { PaymentMethodDB } from '../src/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ImagePickerComponent from '../src/components/forms/ImagePicker';
import { showSuccessToast, showErrorToast } from '../src/utils/toast';

export default function PaymentScreen() {
  const { productId, productName, productPrice } = useLocalSearchParams();
  const { token } = useAppStore();
  const { t } = useI18n();

  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [senderName, setSenderName] = useState('');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentPhoneNumber, setPaymentPhoneNumber] = useState('41791082');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDB[]>([]);
  
  // Map payment method names to enum values
  const paymentMethodEnumMap: Record<string, string> = {
    'بنكيلي': 'bankily',
    'السداد': 'sidad', 
    'مصرفي': 'masrvi',
    'بيم بنك': 'bimbank',
    'أمانتي': 'amanati',
    'كليك': 'klik'
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const methodsResponse = await apiService.getPaymentMethods();
        if (methodsResponse.data) {
          setPaymentMethods(methodsResponse.data.payment_methods || []);
        }

        if (token) {
          const response = await apiService.adminManageSettings(token, 'get');
          if (response.data?.settings?.payment_number) {
            setPaymentPhoneNumber(response.data.settings.payment_number);
          }
        }
      } catch (error) {
        console.log('Using default payment number');
      }
    };
    
    loadData();
  }, [token]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedMethod) {
      newErrors.method = 'اختر طريقة الدفع';
    }
    if (!senderName.trim()) {
      newErrors.senderName = t('payment.required');
    }
    if (!paymentNumber.trim()) {
      newErrors.paymentNumber = t('payment.required');
    }
    if (!receiptImage) {
      newErrors.receiptImage = t('payment.image_required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!token) {
      showErrorToast('جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى');
      return;
    }

    setLoading(true);

    try {
      // Convert payment method name to enum value
      const selectedPaymentMethod = paymentMethods.find(method => 
        (method.id === selectedMethod || method.name === selectedMethod)
      );
      
      if (!selectedPaymentMethod) {
        showErrorToast('طريقة الدفع المحددة غير صالحة');
        return;
      }
      
      const paymentMethodEnum = paymentMethodEnumMap[selectedPaymentMethod.name] || selectedPaymentMethod.name.toLowerCase();
      
      // Create order
      const orderResponse = await apiService.createOrder(
        token,
        productId as string,
        paymentMethodEnum,
        paymentNumber
      );

      if (orderResponse.error || !orderResponse.data) {
        showErrorToast(orderResponse.error || 'خطأ في إنشاء الطلب');
        return;
      }

      const orderId = orderResponse.data.order_id;
      
      if (!orderId) {
        showErrorToast('خطأ في إنشاء الطلب');
        return;
      }

      // Upload receipt
      const uploadResponse = await apiService.uploadReceipt(
        token,
        orderId,
        receiptImage,
        'jpg'
      );

      if (uploadResponse.error) {
        showErrorToast(uploadResponse.error);
        return;
      }

      showSuccessToast('تم إرسال الطلب بنجاح');
      
      // Navigate back to orders screen after successful submission
      setTimeout(() => {
        router.replace('/(tabs)/orders');
      }, 1500);

    } catch (error) {
      console.error('Payment error:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setLoading(false);
    }
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
          {t('payment.payment_method')}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Payment Number Banner */}
        <Card style={styles.bannerCard}>
          <Text style={styles.bannerText}>
            ادفع إلى الرقم:
          </Text>
          <Text style={styles.phoneNumber}>{paymentPhoneNumber}</Text>
        </Card>

        {/* Product Info */}
        <Card style={styles.productCard}>
          <Text style={styles.productName}>{productName}</Text>
          {productPrice && (
            <Text style={styles.productPrice}>
              {productPrice} {t('products.mru')}
            </Text>
          )}
        </Card>

        {/* Payment Method Selection */}
        <Card style={styles.methodCard}>
          <Text style={styles.sectionTitle}>{t('payment.select_method')}</Text>
          
          <View style={styles.methodGrid}>
            {paymentMethods.map((method) => (
              <Card
                key={method.id || method.name}
                style={[
                  styles.methodOption,
                  selectedMethod === (method.id || method.name) && styles.selectedMethod
                ]}
                onPress={() => setSelectedMethod(method.id || method.name)}
              >
                <Image
                  source={{ uri: method.logo_url || '' }}
                  style={styles.methodLogo}
                  resizeMode="contain"
                />
                <Text style={styles.methodName}>{method.name}</Text>
              </Card>
            ))}
          </View>
          
          {errors.method && (
            <Text style={styles.errorText}>{errors.method}</Text>
          )}
        </Card>

        {/* Payment Information */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>{t('payment.payment_info')}</Text>
          
          <Input
            label={t('payment.sender_name')}
            value={senderName}
            onChangeText={setSenderName}
            placeholder="أدخل اسم المرسل"
            error={errors.senderName}
          />

          <Input
            label={t('payment.sender_number')}
            value={paymentNumber}
            onChangeText={setPaymentNumber}
            placeholder="أدخل رقم الدفع"
            keyboardType="phone-pad"
            error={errors.paymentNumber}
          />

          <ImagePickerComponent
            onImageSelected={(base64, ext) => {
              setReceiptImage(base64);
              if (errors.receiptImage) {
                setErrors(prev => ({ ...prev, receiptImage: '' }));
              }
            }}
            selectedImage={receiptImage}
          />
          
          {errors.receiptImage && (
            <Text style={styles.errorText}>{errors.receiptImage}</Text>
          )}
        </Card>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <Button
            title={t('payment.submit_order')}
            onPress={handleSubmit}
            loading={loading}
            disabled={!selectedMethod || !senderName || !paymentNumber || !receiptImage}
            style={styles.submitButton}
          />
          
          <Text style={styles.disclaimer}>
            {t('payment.under_review')}
          </Text>
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
  bannerCard: {
    backgroundColor: '#2563EB',
    alignItems: 'center',
    marginBottom: 16,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  phoneNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  productCard: {
    marginBottom: 16,
    alignItems: 'center',
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2563EB',
    marginTop: 4,
  },
  methodCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'right',
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  methodOption: {
    width: '48%',
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMethod: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F9FF',
  },
  methodLogo: {
    width: 60,
    height: 40,
    marginBottom: 8,
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  infoCard: {
    marginBottom: 16,
  },
  submitContainer: {
    marginVertical: 16,
  },
  submitButton: {
    marginBottom: 16,
  },
  disclaimer: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'right',
  },
});