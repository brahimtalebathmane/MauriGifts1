import type { PaymentMethod, ProductCategory } from '../types';

export const PAYMENT_METHODS: Record<PaymentMethod, { name: string; logo: string }> = {
  bankily: { name: 'بنكيلي', logo: 'https://i.postimg.cc/0ywf19DB/1200x630wa.png' },
  sidad: { name: 'السداد', logo: 'https://i.postimg.cc/t4Whm2H0/OIP.webp' },
  bimbank: { name: 'بيم بنك', logo: 'https://i.postimg.cc/7YT7fmhC/OIP-1.webp' },
  masrvi: { name: 'مصرفي', logo: 'https://i.postimg.cc/HL38fNZN/Masrvi-bank-logo.png' },
  amanati: { name: 'أمانتي', logo: 'https://i.postimg.cc/xdsyKq2q/464788970-541170771978227-7444745331945134149-n.jpg' },
  klik: { name: 'كليك', logo: 'https://i.postimg.cc/5NwBssVh/unnamed.png' },
};

export const CATEGORY_IMAGES: Record<ProductCategory, string> = {
  pubg: 'https://i.postimg.cc/cLvssbLj/OIP-2.webp',
  free_fire: 'https://i.postimg.cc/C52QJmpB/OIP-3.webp',
  itunes: 'https://i.postimg.cc/QMqYvXrr/R.jpg',
  psn: 'https://i.postimg.cc/bJW59mhG/OIP-4.webp',
};

export const DEFAULT_PAYMENT_NUMBER = '41791082';

export const ORDER_STATUS_COLORS = {
  awaiting_payment: { bg: '#DBEAFE', text: '#1E40AF' },
  under_review: { bg: '#FEF3C7', text: '#92400E' },
  completed: { bg: '#D1FAE5', text: '#065F46' },
  rejected: { bg: '#FEE2E2', text: '#991B1B' },
};