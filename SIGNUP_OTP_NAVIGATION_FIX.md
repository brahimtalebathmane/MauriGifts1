# Signup OTP Navigation Fix

## Change Summary

Updated the signup flow to always navigate to OTP verification after successful account creation, removing the automatic login behavior.

## What Changed

### File: `app/auth/signup.tsx`

**Before:**
```typescript
if (response.data) {
  if (response.data.success && response.data.otp_sent) {
    router.push({
      pathname: '/auth/verify-otp',
      params: {
        phone: formData.phoneNumber,
        token: response.data.token,
        userId: response.data.user.id
      }
    });
  } else {
    // Auto-login fallback ❌
    setAuth(response.data.user, response.data.token);
    router.replace('/(tabs)');
  }
}
```

**After:**
```typescript
if (response.data) {
  // Always navigate to OTP verification ✅
  router.push({
    pathname: '/auth/verify-otp',
    params: {
      phone: formData.phoneNumber
    }
  });
}
```

## Key Changes

1. **Removed Auto-Login:** Signup no longer calls `setAuth()` to log users in automatically
2. **Simplified Navigation:** Always navigates to OTP verification regardless of `otp_sent` flag
3. **Clean Parameters:** Only passes the phone number (8 digits) to verification screen

## User Flow (Updated)

### Signup Process
1. User fills signup form (name, phone, PIN)
2. Backend creates account
3. Backend sends WhatsApp OTP
4. **Frontend navigates to OTP verification screen** ✅
5. User never logged in until OTP verified

### OTP Verification Process
1. User enters 6-digit OTP received via WhatsApp
2. Backend validates OTP
3. Backend creates/returns session token
4. Frontend calls `/me` endpoint to get user data
5. Frontend calls `setAuth()` to log user in
6. User redirected to main app

## Login Flow (Unchanged)

Login continues to work as before - users with verified accounts can log in directly with phone + PIN without OTP verification.

```typescript
// app/auth/login.tsx (unchanged)
if (response.data) {
  setAuth(response.data.user, response.data.token);
  router.replace('/(tabs)');
}
```

## Benefits

1. ✅ **Consistent UX:** All new signups go through OTP verification
2. ✅ **Better Security:** Phone number must be verified before account access
3. ✅ **Cleaner Code:** No conditional logic or fallback paths
4. ✅ **Clear Separation:** Signup ≠ Login, verification required for new accounts

## Testing Checklist

- [x] Signup navigates to OTP screen
- [x] OTP screen receives correct phone number
- [x] OTP verification works correctly
- [x] Login flow unaffected (still works normally)
- [x] Build succeeds with no errors

## Files Modified

- `app/auth/signup.tsx` - Lines 68-77

## Files Verified (No Changes Needed)

- `app/auth/login.tsx` - Login flow unchanged
- `app/auth/verify-otp.tsx` - Already handles verification correctly
- `supabase/functions/signup/index.ts` - Backend unchanged
- `supabase/functions/verify_otp/index.ts` - Backend unchanged

---

**Status:** ✅ Complete and tested
**Build:** ✅ Successful
**Impact:** No breaking changes to existing functionality
