import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Wallet, CheckCircle2 } from 'lucide-react-native';
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
  const { token, user: storeUser } = useAppStore(); // جلب المستخدم من الستور مباشرة
  const { t } = useI18n();

  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [senderName, setSenderName] = useState('');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDB[]>([]);
  const [userStats, setUserStats] = useState({ 
    balance: Number(storeUser?.wallet_balance || 0), 
    isActive: !!storeUser?.is_wallet_active 
  });

  const isWalletSelected = selectedMethod === 'wallet';

  useEffect(() => {
    const loadData = async () => {
      try {
        setDataLoading(true);
        // 1. جلب طرق الدفع التقليدية
        const methodsResponse = await apiService.getPaymentMethods();
        if (methodsResponse.data) {
          setPaymentMethods(methodsResponse.data.payment_methods || []);
        }

        // 2. تحديث بيانات المحفظة من السيرفر للتأكد من أحدث رصيد
        if (token) {
          const response = await apiService.adminListUsers(token);
          if (response.data?.users) {
            // البحث عن بيانات المستخدم الحالي عبر الرقم (أو أول مستخدم للفحص)
            const currentUser = response.data.users.find((u: any) => u.phone_number === storeUser?.phone_number) || response.data.users[0];
            if (currentUser) {
              setUserStats({
                balance: Number(currentUser.wallet_balance || 0),
                isActive: !!currentUser.is_wallet_active
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setDataLoading(false);
      }
    };
    loadData();
  }, [token]);

  const handleSubmit = async () => {
    if (!selectedMethod) {
      showErrorToast('الرجاء اختيار طريقة دفع');
      return;
    }

    if (!isWalletSelected && (!senderName || !paymentNumber || !receiptImage)) {
      showErrorToast('يرجى إكمال بيانات التحويل وإرفاق الصورة');
      return;
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
        return;
      }

      if (!isWalletSelected && orderResponse.data?.order_id && receiptImage) {
        await apiService.uploadReceipt(token!, orderResponse.data.order_id, receiptImage, 'jpg');
      }

      showSuccessToast(isWalletSelected ? 'تم الدفع بنجاح' : 'تم إرسال الطلب');
      router.replace('/(tabs)/orders');
    } catch (error) {
      showErrorToast('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowRight size={24} color="#f3f3f4" />
        </TouchableOpacity>
        <Text style={styles.title}>إتمام الدفع</Text>
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.productCard}>
          <Text style={styles.productName}>{productName}</Text>
          <Text style={styles.productPrice}>{productPrice} MRU</Text>
        </Card>

        {/* خيار المحفظة - يظهر دائماً إذا كانت الحالة محملة */}
        <Text style={styles.sectionTitle}>اختر وسيلة الدفع:</Text>
        
        {userStats.isActive ? (
          <TouchableOpacity 
            onPress={() => {
              if (userStats.balance >= Number(productPrice)) setSelectedMethod('wallet');
              else showErrorToast('رصيد المحفظة غير كافٍ');
            }}
          >
            <Card style={[
              styles.walletOption,
              isWalletSelected && styles.selectedWallet,
              userStats.balance < Number(productPrice) && { opacity: 0.5 }
            ]}>
              <View style={styles.walletHeader}>
                <Wallet size={24} color={isWalletSelected ? "#fff" : "#10b981"} />
                <Text style={[styles.walletLabel, isWalletSelected && {color: '#fff'}]}>الدفع بالمحفظة</Text>
                {isWalletSelected && <CheckCircle2 size={20} color="#fff" />}
              </View>
              <Text style={[styles.walletBalance, isWalletSelected && {color: '#fff'}]}>
                الرصيد: {userStats.balance.toFixed(2)} MRU
              </Text>
            </Card>
          </TouchableOpacity>
        ) : (
          <View style={styles.noWalletBox}>
             <Text style={styles.noWalletText}>المحفظة غير مفعلة لحسابك</Text>
          </View>
        )}

        {/* طرق الدفع التقليدية */}
        <View style={styles.methodsGrid}>
          {paymentMethods.length > 0 ? (
            paymentMethods.map((method) => (
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
            ))
          ) : (
            <Text style={{ color: '#9a9aa5', textAlign: 'center', width: '100%' }}>لا توجد طرق دفع إضافية</Text>
          )}
        </View>

        {!isWalletSelected && selectedMethod !== '' && (
          <Card style={styles.infoCard}>
            <Input label="اسم المرسل" value={senderName} onChangeText={setSenderName} />
            <Input label="رقم الهاتف" value={paymentNumber} onChangeText={setPaymentNumber} keyboardType="phone-pad" />
            <ImagePickerComponent onImageSelected={setReceiptImage} selectedImage={receiptImage} />
          </Card>
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
  sectionTitle: { color: '#f3f3f4', textAlign: 'right', marginBottom: 15, fontSize: 16, fontWeight: 'bold' },
  walletOption: { padding: 16, marginBottom: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#10b981' },
  selectedWallet: { backgroundColor: '#10b981', borderColor: '#fff' },
  walletHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  walletLabel: { fontSize: 16, fontWeight: 'bold', color: '#f3f3f4', flex: 1, textAlign: 'right' },
  walletBalance: { fontSize: 14, color: '#10b981', marginTop: 5, textAlign: 'right' },
  methodsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginBottom: 20, marginTop: 10 },
  methodItem: { width: '31%', padding: 10, backgroundColor: '#1a1a24', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a35' },
  selectedMethodItem: { borderColor: '#f3f3f4', backgroundColor: '#2a2a35' },
  methodLogo: { width: 40, height: 30, marginBottom: 5 },
  methodName: { fontSize: 12, color: '#f3f3f4' },
  infoCard: { padding: 16, marginBottom: 20 },
  mainButton: { height: 55, marginBottom: 40 },
  noWalletBox: { padding: 15, backgroundColor: '#1a1a24', borderRadius: 12, marginBottom: 15 },
  noWalletText: { color: '#ef4444', textAlign: 'center', fontSize: 14 }
});