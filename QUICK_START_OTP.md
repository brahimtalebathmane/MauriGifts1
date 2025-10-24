# Quick Start - Test OTP Verification NOW

## ⚡ 5-Minute Setup

### Step 1: Join Twilio Sandbox (One-Time)
1. Open **WhatsApp**
2. Start new chat with: **+14155238886**
3. Send message: **`join smooth-eagle`**
4. Wait for confirmation message (should arrive in seconds)
5. ✅ Done! You can now receive OTP codes

### Step 2: Start the App
```bash
npm run dev
```

Wait for QR code to appear in terminal.

### Step 3: Open in Expo Go
**On Phone:**
- Open **Expo Go** app
- Scan the QR code
- Wait for app to load

**On Web:**
- Press **`w`** in terminal
- Browser will open automatically

### Step 4: Test OTP Screen

#### Option A: Navigate Directly (Quick Test)
Add this test button temporarily to any screen (e.g., login screen):

```typescript
// In app/auth/login.tsx, add this button for testing
<Button
  title="🧪 Test OTP Screen"
  variant="secondary"
  onPress={() => {
    router.push({
      pathname: '/auth/verify-otp',
      params: { phone: '22230459388' } // Your WhatsApp number with country code
    });
  }}
/>
```

#### Option B: Integrate with Login Flow
See `OTP_INTEGRATION_GUIDE.md` for full integration.

### Step 5: Use the OTP Flow
1. Screen opens showing your phone number
2. Check WhatsApp - you should have received a 6-digit code
3. Enter the code in the app
4. Press **"تحقق الآن"** (Verify Now)
5. ✅ Success! You're logged in

## 🎯 What to Expect

### On Success:
- ✅ Green success message in Arabic
- ✅ Automatic navigation to home screen
- ✅ User session created
- ✅ Token saved securely

### On Error:
- ❌ Red error message
- Shows specific issue (invalid code, expired, etc.)
- Can resend OTP using button

## 🔧 Troubleshooting

### "OTP not received"
```
1. Did you join Twilio Sandbox? (Step 1 above)
2. Is the phone number correct? (Must include country code 222)
3. Try "Resend" button
```

### "App won't load in Expo Go"
```bash
# Clear cache and restart
expo start -c
```

### "Invalid code" error
```
1. Check OTP is exactly 6 digits
2. OTP expires after 5 minutes - request new one
3. Make sure you're using the latest code
```

## 📱 Test Phone Numbers

Format: `222XXXXXXXX` (222 = Mauritania country code)

Example valid phones:
- `22230459388`
- `22241791082`
- `222YOURNUMBER` (replace with your actual number)

## ⚡ Quick Commands

```bash
# Start dev server
npm run dev

# Start with cache cleared
expo start -c

# Start in production mode
expo start --no-dev

# Start with tunnel (for remote testing)
expo start --tunnel
```

## 🎨 Screen Preview

When you open the OTP screen, you'll see:

```
┌─────────────────────────────┐
│       MauriGift            │
│   تحقق من رمز الواتساب     │
│                            │
│  تم إرسال رمز التحقق إلى   │
│       22230459388          │
│                            │
│  ┌──────────────────────┐  │
│  │ رمز التحقق (OTP)     │  │
│  │ [____________]       │  │
│  │                      │  │
│  │  [تحقق الآن]         │  │
│  └──────────────────────┘  │
│                            │
│  لم يصلك الرمز؟            │
│  [إعادة الإرسال]           │
│                            │
│  📱 Twilio Sandbox info... │
└─────────────────────────────┘
```

## 🚀 Next Steps

After successful testing:

1. **Integrate** into your auth flow (see OTP_INTEGRATION_GUIDE.md)
2. **Customize** the UI colors/branding if needed
3. **Remove** test buttons before production
4. **Test** on both iOS and Android
5. **Deploy** to production

## 📞 Need Help?

Check these files:
- `OTP_INTEGRATION_GUIDE.md` - Full integration guide
- `EXPO_GO_TROUBLESHOOTING.md` - Fix Expo Go issues
- `WHY_EXPO_GO_FAILED.md` - Technical details
- `OTP_VERIFICATION_SUMMARY.md` - Complete overview

## ✅ Success Indicators

You know it's working when:
- ✅ WhatsApp message arrives within seconds
- ✅ OTP input accepts 6 digits
- ✅ Success toast shows in Arabic
- ✅ Navigates to home automatically
- ✅ Can resend OTP if needed

## 🎉 That's It!

Your OTP verification is ready to use. Happy testing! 🚀

---

**Estimated Time:** 5 minutes
**Difficulty:** Easy ⭐
**Status:** Production Ready ✅
