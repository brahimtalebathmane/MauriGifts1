import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, User as UserIcon, Wallet } from 'lucide-react-native';
import { useAppStore } from '@/state/store';
import { apiService } from '../../../src/services/api';
import { useI18n } from '@/hooks/useI18n';
import type { User } from '../../../src/types';
import { showErrorToast } from '../../../src/utils/toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import WalletManagementModal from '@/components/admin/WalletManagementModal';

interface UserData extends User {
  order_count: number;
}

export default function AdminUsersScreen() {
  const { token } = useAppStore();
  const { t } = useI18n();
  const [users, setUsers] = React.useState<UserData[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<UserData | null>(null);
  const [walletModalVisible, setWalletModalVisible] = React.useState(false);

  const loadUsers = async (isRefresh = false) => {
    if (!token) return;
    
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await apiService.adminListUsers(token);
      if (response.data && response.data.users) {
        setUsers(response.data.users);
      } else {
        showErrorToast(response.error || t('errors.generic'));
      }
    } catch (error) {
      console.error('Error loading users:', error);
      showErrorToast(t('errors.network'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [token]);

  const formatPhoneNumberLocal = (phone: string) => {
    if (!phone) return '';
    return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3-$4');
  };

  // دالة تحديث بيانات المستخدم في الحالة المحلية فوراً
  const handleUpdateUserInState = (updatedUser: any) => {
    setUsers(prevUsers => 
      prevUsers.map(u => 
        u.id === updatedUser.id 
          ? { ...u, ...updatedUser } 
          : u
      )
    );
  };

  if (loading && users.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('admin.users')}</Text>
        </View>
        <ScrollView style={styles.content}>
          {[1, 2, 3].map((i) => (
            <Card key={i} style={styles.userCard}>
              <Skeleton height={20} width={150} />
              <Skeleton height={16} width={120} style={styles.skeletonMargin} />
              <Skeleton height={16} width={100} />
            </Card>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('admin.users')}</Text>
        <Text style={styles.subtitle}>
          المجموع: {users.length} مستخدم
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => loadUsers(true)} 
          />
        }
      >
        {users.length === 0 ? (
          <EmptyState
            icon={<Users size={64} color="#9CA3AF" />}
            title="لا يوجد مستخدمون"
            subtitle="لم يتم تسجيل أي مستخدمين بعد"
          />
        ) : (
          users.map((user) => (
            <Card key={user.id} style={styles.userCard}>
              <View style={styles.userHeader}>
                <View style={styles.roleContainer}>
                  <Text style={[
                    styles.roleText,
                    user.role === 'admin' && styles.adminRole
                  ]}>
                    {user.role === 'admin' ? 'مدير' : 'مستخدم'}
                  </Text>
                </View>
                <View style={styles.userIcon}>
                  <UserIcon size={24} color="#6B7280" />
                </View>
              </View>

              <Text style={styles.userName}>{user.name}</Text>

              <View style={styles.userDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>
                    {formatPhoneNumberLocal(user.phone_number)}
                  </Text>
                  <Text style={styles.detailLabel}>رقم الهاتف:</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>
                    {user.order_count || 0}
                  </Text>
                  <Text style={styles.detailLabel}>{t('admin.order_count')}:</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('ar-SA') : '---'}
                  </Text>
                  <Text style={styles.detailLabel}>تاريخ الانضمام:</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[
                    styles.detailValue,
                    user.is_wallet_active ? styles.activeWallet : styles.inactiveWallet
                  ]}>
                    {user.is_wallet_active ? 'مفعلة' : 'معطلة'}
                  </Text>
                  <Text style={styles.detailLabel}>المحفظة:</Text>
                </View>

                {user.is_wallet_active && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailValue}>
                      {Number(user?.wallet_balance || 0).toFixed(2)} MRU
                    </Text>
                    <Text style={styles.detailLabel}>الرصيد:</Text>
                  </View>
                )}
              </View>

              <Button
                title={t('admin.manage_wallet')}
                variant="outline"
                onPress={() => {
                  setSelectedUser(user);
                  setWalletModalVisible(true);
                }}
                icon={<Wallet size={20} color="#3b82f6" />}
                style={[
                  styles.walletButton,
                  Platform.OS === 'web' && { cursor: 'pointer' }
                ]}
              />
            </Card>
          ))
        )}
      </ScrollView>

      <WalletManagementModal
        visible={walletModalVisible}
        user={selectedUser}
        token={token || ''}
        onClose={() => {
          setWalletModalVisible(false);
          setSelectedUser(null);
        }}
        onSuccess={(updatedUserData) => {
          // ✅ تحديث المستخدم المختار في القائمة فوراً
          if (updatedUserData) {
            handleUpdateUserInState(updatedUserData);
          } else {
            // في حال لم يرجع المودال بيانات، نقوم بعمل ريفريش خلفي
            loadUsers(true);
          }
          setWalletModalVisible(false);
          setSelectedUser(null);
        }}
      />
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
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userCard: {
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  adminRole: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'right',
  },
  userDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  skeletonMargin: {
    marginVertical: 8,
  },
  activeWallet: {
    color: '#10b981',
  },
  inactiveWallet: {
    color: '#ef4444',
  },
  walletButton: {
    marginTop: 12,
  },
});