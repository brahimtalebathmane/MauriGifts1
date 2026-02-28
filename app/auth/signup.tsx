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
import { validatePhoneNumber, validatePin, validateName } from '../../src/utils/validation';
import { showErrorToast } from '../../src/utils/toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function SignUpScreen() {
  const { setAuth } = useAppStore();
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    pin: '',
    confirmPin: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('auth.invalid_phone');
    }

    if (!/^\d{8}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = t('auth.invalid_phone');
    }

    if (!/^\d{4}$/.test(formData.pin)) {
      newErrors.pin = t('auth.invalid_pin');
    }

    if (formData.pin !== formData.confirmPin) {
      newErrors.confirmPin = t('auth.pins_dont_match');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const response = await apiService.signup(
        formData.name.trim(),
        formData.phoneNumber,
        formData.pin
      );

      if (response.data) {
        router.push({
          pathname: '/auth/verify-otp',
          params: {
            phone: formData.phoneNumber
          }
        });
      } else {
        showErrorToast(response.error || t('errors.generic'));
      }
    } catch (error) {
      console.error('Signup error:', error);
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
            <Text style={styles.subtitle}>{t('auth.signup')}</Text>
          </View>

          <Card style={styles.formCard}>
            <Input
              label={t('auth.name')}
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              placeholder="أدخل الاسم الكامل"
              error={errors.name}
              autoCapitalize="words"
            />

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

            <Input
              label={t('auth.confirm_pin')}
              value={formData.confirmPin}
              onChangeText={(value) => updateFormData('confirmPin', value)}
              placeholder={t('auth.pin_placeholder')}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              error={errors.confirmPin}
            />

            <Button
              title={t('auth.signup_button')}
              onPress={handleSignUp}
              loading={loading}
              disabled={!formData.name || !formData.phoneNumber || !formData.pin || !formData.confirmPin}
              style={styles.submitButton}
            />

            <Button
              title={t('auth.have_account')}
              variant="outline"
              onPress={() => router.replace('/auth/login')}
              style={styles.switchButton}
            />
          </Card>
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
});