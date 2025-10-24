# OTP Verification Integration Guide

## Overview
The OTP verification system allows users to log in using WhatsApp OTP codes sent via Twilio.

## Files Created
- `app/auth/verify-otp.tsx` - OTP verification screen

## How It Works

### 1. Request OTP Flow
When a user wants to log in with OTP:

```typescript
// Example: Add this to your login screen or create a new OTP login option
const handleRequestOTP = async (phoneNumber: string) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/request_otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: `222${phoneNumber}`, // Add country code (222 for Mauritania)
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Navigate to verify-otp screen
      router.push({
        pathname: '/auth/verify-otp',
        params: { phone: `222${phoneNumber}` }
      });
    } else {
      // Show error
      showErrorToast(data.message);
    }
  } catch (error) {
    console.error('Request OTP error:', error);
  }
};
```

### 2. Verify OTP Flow
The verify-otp screen handles:
- OTP input (6 digits)
- Verification with backend
- Session token storage
- User data fetching
- Navigation to home screen

### 3. Integration Example

#### Option A: Add to Existing Login Screen
Add a "Login with WhatsApp OTP" button:

```typescript
// In app/auth/login.tsx
<Button
  title="تسجيل الدخول عبر واتساب"
  variant="outline"
  onPress={async () => {
    if (!/^\d{8}$/.test(formData.phoneNumber)) {
      showErrorToast('رقم الهاتف يجب أن يكون 8 أرقام');
      return;
    }

    const fullPhone = `222${formData.phoneNumber}`;
    const response = await fetch(`${SUPABASE_URL}/functions/v1/request_otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: fullPhone }),
    });

    const data = await response.json();
    if (data.success) {
      router.push({
        pathname: '/auth/verify-otp',
        params: { phone: fullPhone }
      });
    }
  }}
  style={styles.otpButton}
/>
```

#### Option B: Create Separate OTP Login Screen
Create a new screen for WhatsApp-only login flow.

## Environment Variables Required
These are already configured in your `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://igcmriczxffobnrlcikl.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SESSION_TTL_DAYS=30
```

## Twilio Sandbox Setup
Users must join the Twilio Sandbox before receiving OTP messages:

1. Send this message to +14155238886 on WhatsApp:
   ```
   join smooth-eagle
   ```

2. Wait for confirmation message

3. Now they can receive OTP codes

## API Endpoints

### 1. Request OTP
**Endpoint:** `POST /functions/v1/request_otp`

**Request:**
```json
{
  "phone": "22230459388"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "✅ تم إرسال رمز التحقق بنجاح عبر واتساب."
}
```

### 2. Verify OTP
**Endpoint:** `POST /functions/v1/verify_otp`

**Request:**
```json
{
  "phone": "22230459388",
  "otp": "409173"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "✅ تم التحقق بنجاح وتفعيل الجلسة.",
  "token": "abc123..."
}
```

## User Experience Flow

1. User enters phone number (8 digits)
2. App adds country code (222) → "22230459388"
3. App calls `request_otp` endpoint
4. User receives WhatsApp message with 6-digit code
5. User enters OTP in verify-otp screen
6. App calls `verify_otp` endpoint
7. On success:
   - Session token saved to SecureStore
   - User data fetched from `/functions/v1/me`
   - Navigation to home screen

## Error Handling

The screen handles:
- ❌ Invalid OTP code
- ❌ Expired OTP (5 minutes)
- ❌ Network errors
- ❌ Missing phone parameter

## Testing

To test the OTP flow:

1. Ensure you've joined Twilio Sandbox on WhatsApp
2. Navigate to verify-otp screen with phone parameter:
   ```typescript
   router.push({
     pathname: '/auth/verify-otp',
     params: { phone: '22230459388' }
   });
   ```
3. Enter the 6-digit OTP received on WhatsApp
4. Verify success/error messages

## Design Features

- ✅ Right-to-left Arabic layout
- ✅ Gold accent color (#D97706) for MauriGift brand
- ✅ Clean, modern UI with Card components
- ✅ Loading states for both verify and resend
- ✅ Toast notifications for user feedback
- ✅ Keyboard handling for mobile
- ✅ Auto-focus on OTP input
- ✅ Resend functionality
- ✅ Back button to return to previous screen

## Security Notes

- Session tokens stored in expo-secure-store (encrypted)
- OTP expires after 5 minutes
- OTP deleted after verification (one-time use)
- No sensitive data logged
- HTTPS only communication

## Troubleshooting

**Issue:** OTP not received
- Solution: Ensure user joined Twilio Sandbox
- Use "Resend" button

**Issue:** "Invalid or expired code"
- Solution: Request new OTP
- Check OTP was entered correctly (6 digits)

**Issue:** Navigation fails after success
- Solution: Check `/functions/v1/me` endpoint is working
- Verify session token is saved correctly
