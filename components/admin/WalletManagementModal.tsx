import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, DollarSign, CircleAlert as AlertCircle, X } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { apiService } from '@/src/services/api';
import { showSuccessToast, showErrorToast } from '@/src/utils/toast';
import { useI18n } from '@/hooks/useI18n';
import type { User } from '@/src/types';

interface WalletManagementModalProps {
  visible: boolean;
  user: User | null;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WalletManagementModal({
  visible,
  user,
  token,
  onClose,
  onSuccess,
}: WalletManagementModalProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [operation, setOperation] = useState<'add' | 'subtract'>('add');

  const handleToggleWallet = async (activate: boolean) => {
    if (!user) return;

    const confirmMessage = activate
      ? 'هل تريد تفعيل المحفظة لهذا المستخدم؟'
      : 'هل تريد تعطيل المحفظة لهذا المستخدم؟';

    const confirmed =
      Platform.OS === 'web'
        ? window.confirm(confirmMessage)
        : await new Promise((resolve) => {
            Alert.alert('تأكيد', confirmMessage, [
              { text: 'إلغاء', style: 'cancel', onPress: () => resolve(false) },
              { text: 'تأكيد', onPress: () => resolve(true) },
            ]);
          });

    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await apiService.adminActivateWallet(token, user.id, activate);
      if (response.data) {
        showSuccessToast(
          activate ? 'تم تفعيل المحفظة بنجاح' : 'تم تعطيل المحفظة بنجاح'
        );
        onSuccess();
      } else {
        showErrorToast(response.error || t('errors.generic'));
      }
    } catch (error) {
      console.error('Error toggling wallet:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustBalance = async () => {
    if (!user || !amount) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showErrorToast('يرجى إدخال مبلغ صحيح');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.adminAdjustWallet(
        token,
        user.id,
        numAmount,
        operation
      );

      if (response.data) {
        showSuccessToast('تم تحديث الرصيد بنجاح');
        setAmount('');
        onSuccess();
      } else {
        showErrorToast(response.error || t('errors.generic'));
      }
    } catch (error) {
      console.error('Error adjusting balance:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Button
            title=""
            variant="ghost"
            onPress={onClose}
            icon={<X size={24} color="#f3f3f4" />}
          />
          <Text style={styles.modalTitle}>إدارة المحفظة</Text>
        </View>

        <ScrollView style={styles.modalContent}>
          <Card style={styles.userInfoCard}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userPhone}>{user.phone_number}</Text>
          </Card>

          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Wallet size={24} color="#3b82f6" />
              <Text style={styles.sectionTitle}>حالة المحفظة</Text>
            </View>

            <View style={styles.toggleRow}>
              <Switch
                value={user.is_wallet_active}
                onValueChange={handleToggleWallet}
                disabled={loading}
                trackColor={{ false: '#767577', true: '#3b82f6' }}
                thumbColor={user.is_wallet_active ? '#ffffff' : '#f4f3f4'}
              />
              <Text style={styles.toggleLabel}>
                {user.is_wallet_active ? 'المحفظة مفعلة' : 'المحفظة معطلة'}
              </Text>
            </View>

            <View style={styles.balanceDisplay}>
              <Text style={styles.balanceLabel}>الرصيد الحالي:</Text>
              <Text style={styles.balanceValue}>
                {user.wallet_balance.toFixed(2)} MRU
              </Text>
            </View>
          </Card>

          {user.is_wallet_active && (
            <Card style={styles.section}>
              <View style={styles.sectionHeader}>
                <DollarSign size={24} color="#10b981" />
                <Text style={styles.sectionTitle}>تعديل الرصيد</Text>
              </View>

              <View style={styles.operationButtons}>
                <Button
                  title="إضافة"
                  variant={operation === 'add' ? 'primary' : 'outline'}
                  onPress={() => setOperation('add')}
                  style={styles.operationButton}
                />
                <Button
                  title="خصم"
                  variant={operation === 'subtract' ? 'primary' : 'outline'}
                  onPress={() => setOperation('subtract')}
                  style={styles.operationButton}
                />
              </View>

              <Input
                label="المبلغ (MRU)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="أدخل المبلغ"
              />

              <View style={styles.infoBox}>
                <AlertCircle size={20} color="#f59e0b" />
                <Text style={styles.infoText}>
                  {operation === 'add'
                    ? 'سيتم إضافة المبلغ إلى رصيد المستخدم'
                    : 'سيتم خصم المبلغ من رصيد المستخدم'}
                </Text>
              </View>

              <Button
                title={operation === 'add' ? 'إضافة الرصيد' : 'خصم الرصيد'}
                onPress={handleAdjustBalance}
                loading={loading}
                disabled={!amount || loading}
              />
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f0f16',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a35',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f3f3f4',
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  userInfoCard: {
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f3f3f4',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 16,
    color: '#9a9aa5',
  },
  section: {
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f3f4',
  },
  toggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a35',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#f3f3f4',
  },
  balanceDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a24',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#9a9aa5',
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  operationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  operationButton: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    textAlign: 'right',
  },
});
