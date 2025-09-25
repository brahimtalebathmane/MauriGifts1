import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useI18n } from '@/hooks/useI18n';
import { OrderStatus } from '@/src/types';
import { ORDER_STATUS_COLORS } from '@/src/constants';

interface StatusChipProps {
  status: OrderStatus;
}

const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const { t } = useI18n();
  const colors = ORDER_STATUS_COLORS[status];

  return (
    <View style={[styles.chip, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {t(`order_status.${status}`)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StatusChip;