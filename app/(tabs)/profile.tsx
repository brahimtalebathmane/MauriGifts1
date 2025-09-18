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
import { useAppStore } from '../../state/store';
import { api } from '../../lib/api';
import { useI18n } from '../../hooks/useI18n';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { showSuccessToast, showErrorToast } from '../../components/ui/Toast';

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
            await logout();
            router.replace('/');
    // In a real app, you would update the user's name via API
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
      const response = await api.changePin(token, pinData.currentPin, pinData.newPin);
      
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
              {user?.phone_number ? formatPhoneNumber(user.phone_number) : ''}
            </Text>
            <Text style={styles.infoLabel}>{t('profile.phone')}:</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>
              {user?.role === 'admin' ? 'مدير' : 'مستخدم'}
            </Text>
            <Text style={styles.infoLabel}>{t('profile.role')}:</Text>
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

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('app.name')} - إصدار 1.0.0
          </Text>
          <Text style={styles.footerText}>
            تم الانضمام في {new Date(user?.created_at || '').toLocaleDateString('ar-SA')}
          </Text>
        </View>
      </ScrollView>

      {/* Change PIN Modal */}
      <Modal
        visible={changePinModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Button
              title="إلغاء"
              onPress={() => {
                setChangePinModal(false);
                setPinData({ currentPin: '', newPin: '', confirmPin: '' });
              }}
              variant="outline"
              size="small"
            />
            <Text style={styles.modalTitle}>تغيير الرمز</Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <Card style={styles.modalCard}>
              <Input
                label="الرمز الحالي"
                value={pinData.currentPin}
                onChangeText={(value) => setPinData(prev => ({ ...prev, currentPin: value }))}
                placeholder="أدخل الرمز الحالي"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />

              <Input
                label="الرمز الجديد"
                value={pinData.newPin}
                onChangeText={(value) => setPinData(prev => ({ ...prev, newPin: value }))}
                placeholder="أدخل الرمز الجديد"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />

              <Input
                label="تأكيد الرمز الجديد"
                value={pinData.confirmPin}
                onChangeText={(value) => setPinData(prev => ({ ...prev, confirmPin: value }))}
                placeholder="أعد إدخال الرمز الجديد"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
              />

              <Button
                title="تغيير الرمز"
                onPress={handleChangePin}
                loading={pinLoading}
                disabled={!pinData.currentPin || !pinData.newPin || !pinData.confirmPin}
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
  profileCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileHeader: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  infoCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'right',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  actionButtons: {
    marginTop: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  settingButton: {
    marginBottom: 12,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
    marginRight: 16,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalCard: {
    marginBottom: 16,
  },
  changePinButton: {
    marginTop: 16,
  },
});