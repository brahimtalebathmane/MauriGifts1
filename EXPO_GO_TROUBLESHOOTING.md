# Expo Go Preview Troubleshooting Guide

## Issue Fixed ✅
**Problem:** App was using `expo-secure-store` directly, which is not fully supported on web in Expo Go.

**Solution:** Updated `verify-otp.tsx` to use the existing `storage` utility that handles both web (localStorage) and native (SecureStore) automatically.

## Common Expo Go Issues & Solutions

### 1. Network/Connection Issues
**Symptoms:**
- "Unable to connect to development server"
- "Network request failed"
- App won't load in Expo Go

**Solutions:**
- Ensure your phone and computer are on the **same Wi-Fi network**
- Disable VPN on both devices
- Check firewall settings aren't blocking Expo
- Try running: `expo start --tunnel` for tunnel connection
- Restart the Expo Dev Server: `npm run dev`

### 2. QR Code Not Scanning
**Solutions:**
- Make sure you're using the Expo Go app (not camera app)
- Increase screen brightness
- Try manual entry: Type the URL shown in terminal into Expo Go
- On iOS: Open Camera app, scan QR, tap the Expo notification

### 3. JavaScript Bundle Failed to Load
**Symptoms:**
- Red error screen in Expo Go
- "Unable to resolve module"
- "Transform error"

**Solutions:**
```bash
# Clear Metro bundler cache
expo start -c

# Or
npx expo start --clear

# If that doesn't work, clear all caches
rm -rf node_modules
rm -rf .expo
npm install
expo start -c
```

### 4. Environment Variables Not Loading
**Symptoms:**
- Undefined EXPO_PUBLIC_* variables
- API calls failing

**Solution:**
- Restart Expo Dev Server after changing `.env`
- Ensure all env vars start with `EXPO_PUBLIC_`
- Check `.env` file exists in project root

### 5. Native Module Errors
**Symptoms:**
- "Native module cannot be found"
- "Invariant Violation"

**Common Causes:**
Some packages require a **development build** and won't work in Expo Go:
- Custom native modules
- Certain camera features
- Some payment SDKs
- Background tasks

**Solution:**
For this app, all dependencies are Expo Go compatible! If you see this error:
```bash
npm install
expo start -c
```

### 6. Platform-Specific Issues

#### iOS Issues:
- **Symptom:** App works on Android but not iOS
- **Solution:** Check iOS-specific permissions in app.json
- Try: Settings > Expo Go > Reset All Settings

#### Android Issues:
- **Symptom:** App works on iOS but not Android
- **Solution:** Enable "Install via USB" in Expo Go settings
- Check Android Developer Options are enabled

### 7. Port Already in Use
**Symptom:** "Port 8081 already in use"

**Solution:**
```bash
# Kill the process
lsof -ti:8081 | xargs kill -9

# Or use different port
expo start --port 8082
```

## How to Test the OTP Flow in Expo Go

### Step 1: Start the Development Server
```bash
npm run dev
```

### Step 2: Open in Expo Go
1. Scan QR code with Expo Go app
2. Wait for app to load

### Step 3: Test OTP Authentication

**Important:** You need to join Twilio Sandbox first!

1. Open WhatsApp
2. Send "join smooth-eagle" to +14155238886
3. Wait for confirmation message
4. Now you can test the OTP flow

### Step 4: Navigate to OTP Screen
The OTP screen can be accessed programmatically:

```typescript
// From anywhere in the app
router.push({
  pathname: '/auth/verify-otp',
  params: { phone: '22230459388' } // Your test phone with country code
});
```

Or add a test button in login screen:
```typescript
<Button
  title="Test OTP (Dev Only)"
  onPress={() => {
    router.push({
      pathname: '/auth/verify-otp',
      params: { phone: '22212345678' }
    });
  }}
/>
```

## Checking Expo Go Compatibility

All dependencies in this app are Expo Go compatible:
- ✅ expo-router
- ✅ expo-secure-store (with web fallback)
- ✅ expo-constants
- ✅ react-native-toast-message
- ✅ zustand
- ✅ All other Expo SDK packages

## Development vs Production

**Expo Go** = Development environment
- Perfect for testing
- No native builds needed
- Some limitations

**EAS Build** = Production builds
- Full native access
- Required for App Store/Play Store
- No limitations

For this app, **Expo Go is sufficient for testing!**

## Still Having Issues?

### Check Expo Doctor
```bash
npx expo-doctor
```

### Check for Syntax Errors
```bash
npm run lint
```

### View Detailed Logs
```bash
expo start --dev-client --clear --verbose
```

### Check Metro Bundler Logs
Look in the terminal where you ran `npm run dev` - errors will show there.

## Quick Checklist

Before asking for help, verify:
- [ ] Same Wi-Fi network for phone and computer
- [ ] `.env` file exists with correct values
- [ ] Ran `npm install`
- [ ] Tried `expo start -c` (clear cache)
- [ ] Expo Go app is updated to latest version
- [ ] No VPN active
- [ ] Checked terminal for error messages
- [ ] Joined Twilio Sandbox (for OTP testing)

## Contact & Support

If issues persist:
1. Check terminal output for specific error messages
2. Share the exact error message you're seeing
3. Mention which platform (iOS/Android)
4. Share any relevant screenshots

## Performance Tips

For better Expo Go performance:
```bash
# Use production mode
expo start --no-dev --minify

# Use LAN instead of localhost
expo start --lan

# Use tunnel for remote testing
expo start --tunnel
```
