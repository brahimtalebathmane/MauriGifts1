import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useI18n } from '../hooks/useI18n';

interface StatusChipProps {
  status: 'awaiting_payment' | 'under_review' | 'completed' | 'rejected';
}

const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  const { t } = useI18n();

  const getStatusStyle = () => {
    switch (status) {
      case 'completed':
        return [styles.chip, styles.success];
      case 'rejected':
        return [styles.chip, styles.error];
      case 'under_review':
        return [styles.chip, styles.warning];
      case 'awaiting_payment':
      default:
        return [styles.chip, styles.info];
    }
  };

  const getTextStyle = () => {
    switch (status) {
      case 'completed':
        return [styles.text, styles.successText];
      case 'rejected':
        return [styles.text, styles.errorText];
      case 'under_review':
        return [styles.text, styles.warningText];
      case 'awaiting_payment':
      default:
        return [styles.text, styles.infoText];
    }
  };

  return (
    <View style={getStatusStyle()}>
      <Text style={getTextStyle()}>
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
  success: {
    backgroundColor: '#D1FAE5',
  },
  error: {
    backgroundColor: '#FEE2E2',
  },
  warning: {
    backgroundColor: '#FEF3C7',
  },
  info: {
    backgroundColor: '#DBEAFE',
  },
  successText: {
    color: '#065F46',
  },
  errorText: {
    color: '#991B1B',
  },
  warningText: {
    color: '#92400E',
  },
  infoText: {
    color: '#1E40AF',
  },
});

export default StatusChip;