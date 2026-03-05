import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { Wallet, Lock, CircleAlert as AlertCircle, Phone } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAppStore } from '@/state/store';
import { useI18n } from '@/hooks/useI18n';
import { apiService } from '@/src/services/api';
import type { WalletLimits } from '@/src/types';

export default function WalletCard() {
  const { user, refreshWallet } = useAppStore();
  const { t } = useI18n();
  const [limits, setLimits] = useState<WalletLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLimits();
  }, []);

  const loadLimits = async () => {
    try {
      const response = await apiService.getWalletLimits();
      if (response.data?.limits) {
        setLimits(response.data.limits);
      }
    } catch (error) {
      console.error('Error loading wallet limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactAdmin = () => {
    const phoneNumber = '22241791082';
    Linking.openURL(`tel:${phoneNumber}`);
  };

  if (loading) {
    return (
      <Card style={styles.card}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </Card>
    );
  }

  if (!user?.is_wallet_active) {
    return (
      <Card style={styles.card}>
        <View style={styles.iconContainer}>
          <Lock size={48} color="#ef4444" />
        </View>

        <Text style={styles.title}>{t('wallet.title')}</Text>

        <View style={styles.inactiveContainer}>
          <AlertCircle size={24} color="#f59e0b" />
          <Text style={styles.inactiveText}>{t('wallet.inactive_msg')}</Text>
        </View>

        <Button
          title={t('wallet.contact_admin')}
          onPress={handleContactAdmin}
          icon={<Phone size={20} color="#ffffff" />}
          style={styles.contactButton}
        />
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Wallet size={32} color="#3b82f6" />
        <Text style={styles.title}>{t('wallet.title')}</Text>
      </View>

      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>{t('wallet.balance')}</Text>
        <Text style={styles.balanceAmount}>
          {user.wallet_balance.toFixed(2)} {t('wallet.currency')}
        </Text>
      </View>

      {limits && (
        <View style={styles.limitsContainer}>
          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>{t('wallet.min_usage')}:</Text>
            <Text style={styles.limitValue}>
              {limits.min_deposit} {t('wallet.currency')}
            </Text>
          </View>
          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>{t('wallet.max_balance')}:</Text>
            <Text style={styles.limitValue}>
              {limits.max_balance} {t('wallet.currency')}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.statusContainer}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>{t('wallet.active')}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f3f3f4',
  },
  balanceContainer: {
    backgroundColor: '#1a1a24',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#9a9aa5',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  limitsContainer: {
    backgroundColor: '#1a1a24',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  limitLabel: {
    fontSize: 14,
    color: '#9a9aa5',
  },
  limitValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f3f3f4',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  inactiveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  inactiveText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  contactButton: {
    marginTop: 8,
  },
});
