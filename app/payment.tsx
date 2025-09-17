import React, { useState } from 'react';
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
import { useAppStore } from '../state/store';
import { api } from '../lib/api';
import { useI18n } from '../hooks/useI18n';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ImagePickerComponent from '../components/ImagePicker';
import { showSuccessToast, showErrorToast } from '../components/ui/Toast';

const PAYMENT_METHODS = {
  bankily: { name: 'بنكيلي', logo: 'https://i.postimg.cc/0ywf19DB/1200x630wa.png' },
  sidad: { name: 'السداد', logo: 'https://i.postimg.cc/t4Whm2H0/OIP.webp' },
  bimbank: { name: 'بيم بنك', logo: 'https://i.postimg.cc/7YT7fmhC/OIP-1.webp' },
  masrvi: { name: 'مصرفي', logo: 'https://i.postimg.cc/HL38fNZN/Masrvi-bank-logo.png' },
  amanati: { name: 'أمانتي', logo: 'https://i.postimg.cc/xdsyKq2q/464788970-541170771978227-7444745331945134149-n.jpg' },
  klik: { name: 'كليك', logo: 'https://i.postimg.cc/5NwBssVh/unnamed.png' },
};

export default function PaymentScreen() {
  const { productId, productName } = useLocalSearchParams();
  const { token } = useAppStore();
  const { t } = useI18n();

  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [senderName, setSenderName] = useState('');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentPhoneNumber, setPaymentPhoneNumber] = useState('41791082');

  useEffect(() => {
    // Load payment number from settings
    const loadPaymentNumber = async () => {
      try {
        const response = await api.adminManageSettings(token || '', 'get');
        if (response.data?.settings?.payment_number) {
          setPaymentPhoneNumber(response.data.settings.payment_number);
        }
      } catch (error) {
        // Use default if can't load
        console.log('Using default payment number');
      }
    };
    
    loadPaymentNumber();
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
    if (!validateForm() || !token) return;

    setLoading(true);
    
    try {
      // Create order
      const orderResponse = await api.createOrder(
        token,
        productId as string,
        selectedMethod,
        paymentNumber
      );

      if (orderResponse.error) {
        showErrorToast(orderResponse.error);
        return;
      }

      const orderId = orderResponse.data?.order_id;
      
      // Upload receipt
      const uploadResponse = await api.uploadReceipt(
        token,
        orderId,
        receiptImage,
        'jpg'
      );

      if (uploadResponse.error) {
        showErrorToast(uploadResponse.error);
        return;
      }

      showSuccessToast(t('payment.order_submitted'));
      router.replace('/(tabs)/orders');

    } catch (error) {
      console.error('Payment error:', error);
      showErrorToast(t('errors.generic'));
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
        </Card>

        {/* Payment Method Selection */}
        <Card style={styles.methodCard}>
          <Text style={styles.sectionTitle}>{t('payment.select_method')}</Text>
          
          <View style={styles.methodGrid}>
            {Object.entries(PAYMENT_METHODS).map(([key, method]) => (
              <Card
                key={key}
                style={[
                  styles.methodOption,
                  selectedMethod === key && styles.selectedMethod
                ]}
                onPress={() => setSelectedMethod(key)}
              >
                <Image
                  source={{ uri: method.logo }}
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