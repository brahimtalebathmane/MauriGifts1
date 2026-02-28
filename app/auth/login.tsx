import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '@/state/store';
import { apiService } from '../../src/services/api';
import { useI18n } from '@/hooks/useI18n';
import { validatePhoneNumber, validatePin } from '../../src/utils/validation';
import { showErrorToast } from '../../src/utils/toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function LoginScreen() {
  const { setAuth } = useAppStore();
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    phoneNumber: '',
    pin: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!/^\d{8}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = t('auth.invalid_phone');
    }

    if (!/^\d{4}$/.test(formData.pin)) {
      newErrors.pin = t('auth.invalid_pin');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const response = await apiService.login(formData.phoneNumber, formData.pin);

      if (response.data) {
        setAuth(response.data.user, response.data.token);
        router.replace('/(tabs)');
      } else {
        showErrorToast(response.error || t('errors.invalid_credentials'));
      }
    } catch (error) {
      console.error('Login error:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('app.name')}</Text>
            <Text style={styles.subtitle}>{t('auth.login')}</Text>
          </View>

          <Card style={styles.formCard}>
            <Input
              label={t('auth.phone_number')}
              value={formData.phoneNumber}
              onChangeText={(value) => updateFormData('phoneNumber', value)}
              placeholder={t('auth.phone_placeholder')}
              keyboardType="phone-pad"
              maxLength={8}
              error={errors.phoneNumber}
            />

            <Input
              label={t('auth.pin')}
              value={formData.pin}
              onChangeText={(value) => updateFormData('pin', value)}
              placeholder={t('auth.pin_placeholder')}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              error={errors.pin}
            />

            <Button
              title={t('auth.login_button')}
              onPress={handleLogin}
              loading={loading}
              disabled={!formData.phoneNumber || !formData.pin}
              style={styles.submitButton}
            />

            <Button
              title={t('auth.no_account')}
              variant="outline"
              onPress={() => router.replace('/auth/signup')}
              style={styles.switchButton}
            />
          </Card>

          <View style={styles.adminHint}>
            <Text style={styles.hintText}>
              للوصول كمدير: رقم الهاتف 00000000 والرمز 1234
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f16',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f3f3f4',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#9a9aa5',
  },
  formCard: {
    padding: 24,
  },
  submitButton: {
    marginTop: 16,
  },
  switchButton: {
    marginTop: 12,
  },
  adminHint: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  hintText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
});