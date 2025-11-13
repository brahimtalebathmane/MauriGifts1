import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/state/store';
import { useI18n } from '@/hooks/useI18n';
import { showErrorToast } from '../../src/utils/toast';
import { storage } from '../../src/utils/storage';
import { STORAGE_KEYS } from '../../src/config';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from 'react-native-toast-message';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

interface VerifyOTPResponse {
  success: boolean;
  message: string;
  token?: string;
}

interface RequestOTPResponse {
  success: boolean;
  message: string;
}

export default function VerifyOTPScreen() {
  const params = useLocalSearchParams<{ phone: string; token?: string; userId?: string }>();
  const { phone, token: signupToken, userId: signupUserId } = params;
  const { setAuth } = useAppStore();
  const { t } = useI18n();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!phone) {
      router.replace('/auth/login');
    }
  }, [phone]);

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) {
      setError('الرجاء إدخال رمز التحقق');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formattedPhone = phone.startsWith('+222') ? phone : `+222${phone}`;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify_otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
          otp,
        }),
      });

      const data: VerifyOTPResponse = await response.json();

      if (data.success && data.token) {
        await storage.setItem(STORAGE_KEYS.token, data.token);

        Toast.show({
          type: 'success',
          text1: data.message || '✅ تم التحقق بنجاح وتفعيل الجلسة.',
          position: 'top',
          visibilityTime: 2000,
        });

        const phoneNumber = phone.length === 11 ? phone.slice(-8) : phone;

        const meResponse = await fetch(`${SUPABASE_URL}/functions/v1/me`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (meResponse.ok) {
          const userData = await meResponse.json();
          if (userData.data?.user) {
            setAuth(userData.data.user, data.token);
          }
        }

        setTimeout(() => {
          router.replace('/(tabs)');
        }, 500);
      } else {
        setError(data.message || '❌ الرمز غير صالح أو منتهي الصلاحية.');
        Toast.show({
          type: 'error',
          text1: data.message || '❌ الرمز غير صالح أو منتهي الصلاحية.',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      const errorMsg = 'حدث خطأ غير متوقع، حاول لاحقاً.';
      setError(errorMsg);
      showErrorToast(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    setError('');

    try {
      const formattedPhone = phone.startsWith('+222') ? phone : `+222${phone}`;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/request_otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
        }),
      });

      const data: RequestOTPResponse = await response.json();

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: data.message || '✅ تم إرسال رمز التحقق بنجاح عبر واتساب.',
          position: 'top',
          visibilityTime: 3000,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: data.message || '❌ حدث خطأ أثناء إرسال رمز التحقق.',
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      showErrorToast('حدث خطأ أثناء إعادة الإرسال');
    } finally {
      setResendLoading(false);
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
            <Text style={styles.title}>MauriGift</Text>
            <Text style={styles.subtitle}>تحقق من رمز الواتساب</Text>
            <Text style={styles.description}>
              تم إرسال رمز التحقق إلى رقم الواتساب
            </Text>
            <View style={styles.phoneContainer}>
              <Text style={styles.phoneNumber}>{phone}</Text>
            </View>
          </View>

          <Card style={styles.formCard}>
            <Input
              label="رمز التحقق (OTP)"
              value={otp}
              onChangeText={(value) => {
                setOtp(value);
                setError('');
              }}
              placeholder="أدخل الرمز المكون من 6 أرقام"
              keyboardType="number-pad"
              maxLength={6}
              error={error}
              autoFocus
            />

            <Button
              title="تحقق الآن"
              onPress={handleVerifyOTP}
              loading={loading}
              disabled={!otp || otp.length < 4}
              style={styles.submitButton}
            />

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>لم يصلك الرمز؟</Text>
              <Button
                title="إعادة الإرسال"
                variant="outline"
                size="small"
                onPress={handleResendOTP}
                loading={resendLoading}
                disabled={resendLoading}
                style={styles.resendButton}
              />
            </View>

            <Button
              title="رجوع"
              variant="secondary"
              onPress={() => router.back()}
              style={styles.backButton}
            />
          </Card>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📱 تأكد من أنك قمت بالانضمام إلى Twilio Sandbox على واتساب
            </Text>
            <Text style={styles.infoSubtext}>
              أرسل "join smooth-eagle" إلى +14155238886
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
    backgroundColor: '#F9FAFB',
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
    color: '#D97706',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#374151',
    marginBottom: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  phoneContainer: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400E',
    textAlign: 'center',
    direction: 'ltr',
  },
  formCard: {
    padding: 24,
  },
  submitButton: {
    marginTop: 16,
    backgroundColor: '#D97706',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  resendText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backButton: {
    marginTop: 12,
  },
  infoBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    textAlign: 'right',
    marginBottom: 6,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#3B82F6',
    textAlign: 'center',
    fontWeight: '600',
    direction: 'ltr',
  },
});
