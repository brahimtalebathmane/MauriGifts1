import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Wallet, CheckCircle2 } from 'lucide-react-native';
import { useAppStore } from '@/state/store';
import { apiService } from '@/src/services/api';
import { useI18n } from '@/hooks/useI18n';
import type { PaymentMethodDB } from '@/src/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ImagePickerComponent from '@/src/components/forms/ImagePicker';
import { showSuccessToast, showErrorToast } from '@/src/utils/toast';

export default function PaymentScreen() {
  const { productId, productName, productPrice } = useLocalSearchParams();
  const { token, user, refreshWallet } = useAppStore();
  const { t } = useI18n();

  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [senderName, setSenderName] = useState('');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDB[]>([]);

  const isWalletSelected = selectedMethod === 'wallet';
  const userBalance = Number(user?.wallet_balance || 0);
  const isWalletActive = !!user?.is_wallet_active;
  const productPriceNum = Number(productPrice);

  useEffect(() => {
    const loadData = async () => {
      try {
        const methodsResponse = await apiService.getPaymentMethods();
        if (methodsResponse.data) {
          setPaymentMethods(methodsResponse.data.payment_methods || []);
        }

        if (token) {
          await refreshWallet();
        }
      } catch (error) {
        console.error('Error loading data');
      }
    };
    loadData();
  }, [token]);

  const handleSubmit = async () => {
    if (!selectedMethod) {
      showErrorToast('الرجاء اختيار طريقة دفع');
      return;
    }

    if (!isWalletSelected) {
      if (!senderName || !paymentNumber || !receiptImage) {
        showErrorToast('يرجى إكمال بيانات التحويل وإرفاق الصورة');
        return;
      }
    }

    setLoading(true);
    try {
      const orderResponse = await apiService.createOrder(
        token!,
        productId as string,
        isWalletSelected ? 'wallet' : selectedMethod.toLowerCase(),
        isWalletSelected ? 'wallet_payment' : paymentNumber
      );

      if (orderResponse.error) {
        showErrorToast(orderResponse.error);
        setLoading(false);
        return;
      }

      const orderId = orderResponse.data.order_id;

      if (!isWalletSelected && receiptImage) {
        await apiService.uploadReceipt(token!, orderId, receiptImage, 'jpg');
      }

      if (isWalletSelected) {
        await refreshWallet();
      }

      showSuccessToast(isWalletSelected ? 'تم الدفع بنجاح من المحفظة' : 'تم إرسال الطلب للمراجعة');

      setTimeout(() => {
        router.replace('/(tabs)/orders');
      }, 1500);

    } catch (error) {
      showErrorToast('حدث خطأ أثناء المعالجة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowRight size={24} color="#f3f3f4" />
        </TouchableOpacity>
        <Text style={styles.title}>إتمام الدفع</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* ملخص المنتج */}
        <Card style={styles.productCard}>
          <Text style={styles.productName}>{productName}</Text>
          <Text style={styles.productPrice}>{productPrice} MRU</Text>
        </Card>

        {/* --- خيار المحفظة (يظهر فقط إذا كانت مفعلة) --- */}
        {isWalletActive && (
          <TouchableOpacity
            onPress={() => {
              if (userBalance >= productPriceNum) {
                setSelectedMethod('wallet');
              } else {
                showErrorToast('رصيد المحفظة غير كافٍ');
              }
            }}
            activeOpacity={0.7}
            disabled={userBalance < productPriceNum}
          >
            <Card style={[
              styles.walletOption,
              isWalletSelected && styles.selectedWallet,
              userBalance < productPriceNum && { opacity: 0.5 }
            ]}>
              <View style={styles.walletHeader}>
                <Wallet size={24} color={isWalletSelected ? "#fff" : "#10b981"} />
                <Text style={[styles.walletLabel, isWalletSelected && {color: '#fff'}]}>الدفع بالمحفظة (فوري)</Text>
                {isWalletSelected && <CheckCircle2 size={20} color="#fff" />}
              </View>
              <Text style={[styles.walletBalance, isWalletSelected && {color: '#fff'}]}>
                رصيدك الحالي: {userBalance.toFixed(2)} MRU
              </Text>
              {userBalance < productPriceNum && (
                <Text style={styles.insufficientText}>الرصيد غير كافٍ</Text>
              )}
            </Card>
          </TouchableOpacity>
        )}

        <Text style={styles.separatorText}>أو اختر وسيلة دفع أخرى:</Text>

        {/* --- طرق الدفع التقليدية --- */}
        <View style={styles.methodsGrid}>
          {paymentMethods.map((method) => (
            <TouchableOpacity 
              key={method.id} 
              onPress={() => setSelectedMethod(method.name)}
              style={[
                styles.methodItem,
                selectedMethod === method.name && styles.selectedMethodItem
              ]}
            >
              <Image source={{ uri: method.logo_url }} style={styles.methodLogo} resizeMode="contain" />
              <Text style={styles.methodName}>{method.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* --- حقول إضافية تظهر فقط للدفع التقليدي --- */}
        {!isWalletSelected && selectedMethod !== '' && (
          <View style={styles.traditionalFields}>
            <Card style={styles.infoCard}>
              <Input label="اسم المرسل الكامل" value={senderName} onChangeText={setSenderName} placeholder="الاسم كما في التطبيق" />
              <Input label="رقم الهاتف المرسل منه" value={paymentNumber} onChangeText={setPaymentNumber} keyboardType="phone-pad" />
              <Text style={styles.uploadLabel}>صورة إيصال التحويل:</Text>
              <ImagePickerComponent onImageSelected={(img) => setReceiptImage(img)} selectedImage={receiptImage} />
            </Card>
          </View>
        )}

        <Button
          title={isWalletSelected ? "تأكيد الدفع الفوري" : "إرسال الطلب"}
          onPress={handleSubmit}
          loading={loading}
          style={[styles.mainButton, isWalletSelected && {backgroundColor: '#10b981'}]}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f16' },
  header: { flexDirection: 'row-reverse', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#2a2a35' },
  backButton: { padding: 5 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#f3f3f4', flex: 1, textAlign: 'right', marginRight: 10 },
  content: { padding: 16 },
  productCard: { padding: 16, alignItems: 'center', marginBottom: 20 },
  productName: { fontSize: 18, color: '#f3f3f4' },
  productPrice: { fontSize: 24, fontWeight: 'bold', color: '#10b981', marginTop: 5 },
  walletOption: { padding: 16, marginBottom: 15, borderStyle: 'dashed', borderWidth: 2, borderColor: '#10b981' },
  selectedWallet: { backgroundColor: '#10b981', borderColor: '#fff', borderStyle: 'solid' },
  walletHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  walletLabel: { fontSize: 16, fontWeight: 'bold', color: '#f3f3f4', flex: 1, textAlign: 'right' },
  walletBalance: { fontSize: 14, color: '#10b981', marginTop: 5, textAlign: 'right', fontWeight: '600' },
  insufficientText: { fontSize: 12, color: '#ef4444', marginTop: 5, textAlign: 'right', fontWeight: '600' },
  separatorText: { color: '#9a9aa5', textAlign: 'right', marginBottom: 15, fontSize: 14 },
  methodsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  methodItem: { width: '31%', padding: 10, backgroundColor: '#1a1a24', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a35' },
  selectedMethodItem: { borderColor: '#f3f3f4', backgroundColor: '#2a2a35' },
  methodLogo: { width: 40, height: 30, marginBottom: 5 },
  methodName: { fontSize: 12, color: '#f3f3f4' },
  traditionalFields: { marginBottom: 20 },
  infoCard: { padding: 16 },
  uploadLabel: { color: '#f3f3f4', textAlign: 'right', marginBottom: 10 },
  mainButton: { height: 55, marginTop: 10, marginBottom: 40 },
});