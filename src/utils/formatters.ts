export const formatPhoneNumber = (phone: string): string => {
  return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3-$4');
};

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('ar-SA').format(price);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return 'منذ قليل';
  } else if (diffHours < 24) {
    return `منذ ${diffHours} ساعة`;
  } else if (diffDays < 7) {
    return `منذ ${diffDays} أيام`;
  } else {
    return date.toLocaleDateString('ar-SA');
  }
};

export const formatCurrency = (amount: number, currency: string = 'أوقية'): string => {
  return `${formatPrice(amount)} ${currency}`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};