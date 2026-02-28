# MAURIPLAY

A React Native gaming platform built with Expo for managing game top-ups and digital purchases with full Arabic support.

## Features

- Multi-game support (PUBG, Free Fire, iTunes, PlayStation, etc.)
- Secure payment processing
- Real-time order tracking
- Admin dashboard
- Arabic RTL interface
- Dark theme UI (#0f0f16 / #f3f3f4)

## Tech Stack

- React Native with Expo SDK 54
- Expo Router for navigation
- Supabase for backend
- TypeScript
- Zustand for state management
- Lucide React Native for icons

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=https://gyuicmqdtxjyomkiydmc.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Build for Production

```bash
# Web build
npm run build:web
```

## Deployment

### Expo Go
1. Run `npm run dev`
2. Scan QR code with Expo Go app

### Netlify (Web)
1. Build: `npm run build:web`
2. Deploy `dist` folder
3. Set environment variables in Netlify dashboard

## Project Structure

```
app/
├── (tabs)/           # Main app screens (Home, Orders, Profile, Notifications)
│   └── admin/       # Admin panel screens
├── auth/            # Authentication (Login, Signup, OTP)
├── category/        # Category detail screens
├── payment.tsx      # Payment flow
└── index.tsx        # Entry/splash screen

src/
├── components/      # Reusable UI components
│   ├── ui/         # Button, Card, Input, etc.
│   ├── common/     # StatusChip, etc.
│   └── forms/      # ImagePicker, etc.
├── services/       # API services
├── types/          # TypeScript types
├── utils/          # Utility functions
├── hooks/          # Custom hooks
└── config/         # Configuration

supabase/
├── migrations/     # Database migrations
└── functions/      # Edge functions
```

## Admin Access

- Phone: `00000000`
- PIN: `1234`

## User Features

- Phone + PIN authentication
- Browse game categories
- Purchase game credits
- Multiple payment methods
- Upload payment receipts
- Track order status
- Receive delivery codes
- Notifications system

## Admin Features

- User management
- Order management
- Approve/reject orders
- Send delivery codes
- Activity logs
- Payment method configuration
- Product/category management

## Color Theme

- Primary Background: `#0f0f16`
- Secondary Text: `#f3f3f4`
- Card Background: `#1a1a25`
- Border Color: `#2a2a35`

## License

Private - All rights reserved