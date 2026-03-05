import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Wallet } from 'lucide-react-native';
import { useAppStore } from '@/state/store';
import { apiService } from '../src/services/api';
import { useI18n } from '@/hooks/useI18n';
import type { PaymentMethodDB, User } from '../src/types';
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
  const [fetchingUser, setFetchingUser] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDB[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const isWalletSelected = selectedMethod === 'wallet';

  useEffect(() => {
    const loadData = async () => {
      setFetchingUser(true);
      try {
        // جلب طرق الدفع
        const methodsResponse = await apiService.getPaymentMethods();
        if (methodsResponse.data) {
          setPaymentMethods(methodsResponse.data.payment_methods || []);
        }

        // جلب بيانات المستخدم للتأكد من المحفظة
        if (token) {
          // نفترض وجود دالة لجلب البروفايل أو نستخدم بيانات الـ Store
          const response = await apiService.adminListUsers(token); // أو أي endpoint لجلب بياناتي
          // ملاحظة: يفضل استخدام endpoint خاص بـ getProfile هنا
          if (response.data?.users) {
             const me = response.data.users.find((u: any) => u.phone_number); // تجريبي
             setCurrentUser(me);
          }
        }
      } catch (error) {
        console.log('Error loading initial data');
      } finally {
        setFetchingUser(false);
      }
    };
    
    loadData();
  }, [token]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedMethod) {
      newErrors.method = 'اختر طريقة الدفع';
    }

    // إذا كان الدفع بالمحفظة، لا نحتاج لاسم مرسل أو صورة إيصال
    if (!isWalletSelected) {
      if (!senderName.trim()) newErrors.senderName = t('payment.required');
      if (!paymentNumber.trim()) newErrors.paymentNumber = t('payment.required');
      if (!receiptImage) newErrors.receiptImage = t('payment.image_required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!token) {
      showErrorToast('جلسة غير صالحة');
      return;
    }

    setLoading(true);
    try {
      // 1. إنشاء الطلب
      const orderResponse = await apiService.createOrder(
        token,
        productId as string,
        isWalletSelected ? 'wallet' : selectedMethod.toLowerCase(),
        isWalletSelected ? (currentUser?.phone_number || '') : paymentNumber
      );

      if (orderResponse.error) {
        showErrorToast(orderResponse.error);
        setLoading(false);
        return;
      }

      const orderId = orderResponse.data.order_id;

      // 2. إذا لم يكن دفعاً بالمحفظة، نرفع الصورة
      if (!isWalletSelected && orderId && receiptImage) {
        const uploadResponse = await apiService.uploadReceipt(
          token, orderId, receiptImage, 'jpg'
        );
        if (uploadResponse.error) {
          showErrorToast(uploadResponse.error);
          setLoading(false);
          return;
        }
      }

      showSuccessToast(isWalletSelected ? 'تم الدفع والطلب بنجاح من المحفظة' : 'تم إرسال الطلب بنجاح');
      
      setTimeout(() => {
        router.replace('/(tabs)/orders');
      }, 1500);

    } catch (error) {
      showErrorToast(t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button title="" onPress={() => router.back()} variant="outline" size="small" style={styles.backButton}>
          <ArrowRight size={20} color="#374151" />
        </Button>
        <Text style={styles.title}>{t('payment.payment_method')}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* معلومات المنتج */}
        <Card style={styles.productCard}>
          <Text style={styles.productName}>{productName}</Text>
          <Text style={styles.productPrice}>{productPrice} {t('products.mru')}</Text>
        </Card>

        {/* خيار الدفع بالمحفظة (إذا كانت مفعلة) */}
        {currentUser?.is_wallet_active && (
          <Card 
            style={[
              styles.walletCard, 
              selectedMethod === 'wallet' && styles.selectedWallet,
              Number(currentUser.wallet_balance) < Number(productPrice) && styles.disabledWallet
            ]}
            onPress={() => {
              if (Number(currentUser.wallet_balance) >= Number(productPrice)) {
                setSelectedMethod('wallet');
              } else {
                showErrorToast('رصيدك في المحفظة غير كافٍ');
              }
            }}
          >
            <View style={styles.walletInfo}>
              <Wallet size={24} color={selectedMethod === 'wallet' ? '#fff' : '#10b981'} />
              <View style={styles.walletTexts}>
                <Text style={[styles.walletTitle, selectedMethod === 'wallet' && {color: '#fff'}]}>الدفع عبر المحفظة</Text>
                <Text style={[styles.walletBalance, selectedMethod === 'wallet' && {color: '#eee'}]}>
                  رصيدك: {Number(currentUser.wallet_balance).toFixed(2)} MRU
                </Text>
              </View>
            </View>
            {Number(currentUser.wallet_balance) < Number(productPrice) && (
              <Text style={styles.insufficientText}>الرصيد غير كافٍ</Text>
            )}
          </Card>
        )}

        {/* طرق الدفع الأخرى */}
        <Card style={styles.methodCard}>
          <Text style={styles.sectionTitle}>طرق دفع أخرى</Text>
          <View style={styles.methodGrid}>
            {paymentMethods.map((method) => (
              <Card
                key={method.id}
                style={[
                  styles.methodOption,
                  selectedMethod === method.name && styles.selectedMethod
                ]}
                onPress={() => {
                    setSelectedMethod(method.name);
                    setReceiptImage(''); // صفر الصورة عند تغيير الطريقة
                }}
              >
                <Image source={{ uri: method.logo_url || '' }} style={styles.methodLogo} resizeMode="contain" />
                <Text style={styles.methodName}>{method.name}</Text>
              </Card>
            ))}
          </View>
        </Card>

        {/* حقول المعلومات (تظهر فقط عند عدم اختيار المحفظة) */}
        {!isWalletSelected && selectedMethod !== '' && (
          <Card style={styles.infoCard}>
            <Text style={styles.sectionTitle}>بيانات التحويل</Text>
            <Input label="اسم المرسل" value={senderName} onChangeText={setSenderName} error={errors.senderName} />
            <Input label="رقم الهاتف المرسل منه" value={paymentNumber} onChangeText={setPaymentNumber} keyboardType="phone-pad" error={errors.paymentNumber} />
            <ImagePickerComponent onImageSelected={(base64) => setReceiptImage(base64)} selectedImage={receiptImage} />
            {errors.receiptImage && <Text style={styles.errorText}>{errors.receiptImage}</Text>}
          </Card>
        )}

        <View style={styles.submitContainer}>
          <Button
            title={isWalletSelected ? "تأكيد الدفع من المحفظة" : t('payment.submit_order')}
            onPress={handleSubmit}
            loading={loading}
            disabled={!selectedMethod || (!isWalletSelected && (!senderName || !paymentNumber || !receiptImage))}
            style={[styles.submitButton, isWalletSelected && {backgroundColor: '#10b981'}]}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f16' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#2a2a35' },
  backButton: { width: 40, height: 40, borderRadius: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#f3f3f4', flex: 1, textAlign: 'right', marginRight: 16 },
  content: { flex: 1, padding: 16 },
  productCard: { marginBottom: 16, alignItems: 'center', padding: 16 },
  productName: { fontSize: 18, fontWeight: '600', color: '#f3f3f4' },
  productPrice: { fontSize: 22, fontWeight: 'bold', color: '#10b981', marginTop: 8 },
  walletCard: { padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a24', borderLeftWidth: 4, borderLeftColor: '#10b981' },
  selectedWallet: { backgroundColor: '#10b981', borderLeftColor: '#fff' },
  disabledWallet: { opacity: 0.5, borderLeftColor: '#666' },
  walletInfo: { flexDirection: 'row', alignItems: 'center' },
  walletTexts: { marginRight: 12, alignItems: 'flex-end' },
  walletTitle: { fontSize: 16, fontWeight: 'bold', color: '#f3f3f4' },
  walletBalance: { fontSize: 14, color: '#10b981' },
  insufficientText: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },
  methodCard: { marginBottom: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#f3f3f4', marginBottom: 12, textAlign: 'right' },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  methodOption: { width: '48%', padding: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#2a2a35' },
  selectedMethod: { borderColor: '#f3f3f4', backgroundColor: '#2a2a35' },
  methodLogo: { width: 50, height: 30, marginBottom: 8 },
  methodName: { fontSize: 12, color: '#f3f3f4' },
  infoCard: { marginBottom: 16, padding: 16 },
  submitContainer: { marginVertical: 24 },
  submitButton: { height: 55 },
  errorText: { color: '#ef4444', fontSize: 12, textAlign: 'right', marginTop: 4 }
});