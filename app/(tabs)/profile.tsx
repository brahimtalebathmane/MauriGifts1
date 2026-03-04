import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '@/state/store';
import { apiService } from '../../src/services/api';
import { useI18n } from '@/hooks/useI18n';
import { showSuccessToast, showErrorToast } from '../../src/utils/toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function ProfileScreen() {
  const { user, token, logout } = useAppStore();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [changePinModal, setChangePinModal] = useState(false);
  const [pinData, setPinData] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: '',
  });
  const [pinLoading, setPinLoading] = useState(false);

  // 🔥 FIXED LOGOUT
  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تسجيل خروج',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();

              if (typeof window !== 'undefined') {
                // Web
                window.localStorage.clear();
                window.sessionStorage.clear();
                window.location.replace('/auth/login');
              } else {
                // Mobile
                router.replace('/auth/login');
              }
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const handleSave = () => {
    showSuccessToast(t('profile.saved'));
    setEditing(false);
  };

  const handleChangePin = async () => {
    if (!token) return;

    if (pinData.newPin !== pinData.confirmPin) {
      showErrorToast(t('auth.pins_dont_match'));
      return;
    }

    if (!/^\d{4}$/.test(pinData.currentPin) || !/^\d{4}$/.test(pinData.newPin)) {
      showErrorToast(t('auth.invalid_pin'));
      return;
    }

    setPinLoading(true);
    try {
      const response = await apiService.changePin(
        token,
        pinData.currentPin,
        pinData.newPin
      );

      if (response.data) {
        showSuccessToast('تم تغيير الرمز بنجاح');
        setChangePinModal(false);
        setPinData({ currentPin: '', newPin: '', confirmPin: '' });
      } else {
        showErrorToast(response.error || 'خطأ في تغيير الرمز');
      }
    } catch (error) {
      console.error('Change PIN error:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setPinLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3-$4');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileRole}>
              {user?.role === 'admin' ? 'مدير' : 'مستخدم'}
            </Text>
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>المعلومات الشخصية</Text>

          {editing ? (
            <Input
              label={t('auth.name')}
              value={name}
              onChangeText={setName}
              placeholder="أدخل الاسم"
            />
          ) : (
            <View style={styles.infoRow}>
              <Text style={styles.infoValue}>{user?.name}</Text>
              <Text style={styles.infoLabel}>{t('profile.name')}:</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>
              {user?.phone_number
                ? formatPhoneNumber(user.phone_number)
                : ''}
            </Text>
            <Text style={styles.infoLabel}>{t('profile.phone')}:</Text>
          </View>

          <View style={styles.actionButtons}>
            {editing ? (
              <View style={styles.buttonRow}>
                <Button
                  title={t('common.cancel')}
                  variant="outline"
                  onPress={() => {
                    setEditing(false);
                    setName(user?.name || '');
                  }}
                  style={styles.button}
                />
                <Button
                  title={t('profile.save')}
                  onPress={handleSave}
                  style={styles.button}
                />
              </View>
            ) : (
              <Button
                title="تعديل المعلومات"
                variant="outline"
                onPress={() => setEditing(true)}
              />
            )}
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>الإعدادات</Text>

          <Button
            title={t('profile.change_pin')}
            variant="outline"
            onPress={() => setChangePinModal(true)}
            style={styles.settingButton}
          />

          <Button
            title={t('auth.logout')}
            variant="danger"
            onPress={handleLogout}
            style={styles.settingButton}
          />
        </Card>
      </ScrollView>

      <Modal
        visible={changePinModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            <Card style={styles.modalCard}>
              <Input
                label="الرمز الحالي"
                value={pinData.currentPin}
                onChangeText={(value) =>
                  setPinData((prev) => ({ ...prev, currentPin: value }))
                }
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />

              <Input
                label="الرمز الجديد"
                value={pinData.newPin}
                onChangeText={(value) =>
                  setPinData((prev) => ({ ...prev, newPin: value }))
                }
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />

              <Input
                label="تأكيد الرمز الجديد"
                value={pinData.confirmPin}
                onChangeText={(value) =>
                  setPinData((prev) => ({ ...prev, confirmPin: value }))
                }
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />

              <Button
                title="تغيير الرمز"
                onPress={handleChangePin}
                loading={pinLoading}
                disabled={
                  !pinData.currentPin ||
                  !pinData.newPin ||
                  !pinData.confirmPin
                }
                style={styles.changePinButton}
              />
            </Card>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f16' },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a35',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f3f3f4',
    textAlign: 'right',
  },
  content: { flex: 1, padding: 16 },
  profileCard: { alignItems: 'center', marginBottom: 16 },
  profileHeader: { alignItems: 'center' },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f3f3f4',
  },
  profileRole: {
    fontSize: 16,
    color: '#f3f3f4',
    backgroundColor: '#2a2a35',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  infoCard: { marginBottom: 16 },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f3f3f4',
    marginBottom: 16,
    textAlign: 'right',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a35',
  },
  infoLabel: { color: '#9a9aa5' },
  infoValue: { color: '#f3f3f4' },
  actionButtons: { marginTop: 16 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  button: { flex: 1 },
  settingButton: { marginBottom: 12 },
  modalContainer: { flex: 1, backgroundColor: '#0f0f16' },
  modalContent: { flex: 1, padding: 16 },
  modalCard: { marginBottom: 16 },
  changePinButton: { marginTop: 16 },
});