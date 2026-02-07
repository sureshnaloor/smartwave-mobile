# Authentication Fixes - Summary

## Issues Fixed

### 1. **Network Timeout Handling**
- Added 15-second timeout to all API requests
- Better error messages for timeout scenarios
- Prevents app from hanging indefinitely on network errors

### 2. **Token Validation on Startup**
- `AuthContext` now validates stored tokens on app startup
- Automatically clears invalid/expired tokens
- Handles network errors gracefully (keeps token but doesn't set user)

### 3. **Improved Error Handling**
- Better error messages in `HomeScreen`
- Clearer network error hints
- Proper handling of unauthorized responses

### 4. **Navigation Logic**
- App now checks both `token` and `user` before showing main app
- Shows sign-in screen if token exists but user couldn't be loaded
- Better loading states during authentication check

## Changes Made

### Files Modified:
1. **`src/api/client.ts`**
   - Added timeout handling (15 seconds)
   - Improved error messages for network failures

2. **`src/context/AuthContext.tsx`**
   - Added token validation on startup
   - Validates token by fetching profile
   - Clears invalid tokens automatically
   - Handles network errors without clearing valid tokens

3. **`src/screens/HomeScreen.tsx`**
   - Better error handling and display
   - Improved loading states
   - Helpful hints for network errors

4. **`App.tsx`**
   - Checks both token and user before navigation
   - Better loading indicator during auth check

## Next Steps

### 1. Verify Backend Server is Running
Make sure your backend server (smartwave) is running:
```bash
cd /Users/sureshmenon/Desktop/nextjsapps/smartwave/smartwave
npm run dev
```

### 2. Update API URL in `.env`
Check your current IP address:
```bash
ipconfig getifaddr en0  # For Wi-Fi
# or
ipconfig getifaddr en1  # For Ethernet
```

Update `.env` file:
```env
EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:3000
```

### 3. Test the App
1. Clear any stored tokens (the app will do this automatically for invalid ones)
2. Run the app: `npm run ios`
3. Sign in with valid credentials
4. The app should now properly handle network errors and timeouts

## Backend API Endpoints Expected

The mobile app expects these endpoints:
- `POST /api/mobile/auth` - Email/password login
- `POST /api/mobile/auth/apple` - Apple sign-in
- `POST /api/mobile/auth/google/start` - Google OAuth start
- `POST /api/mobile/auth/google` - Google OAuth complete
- `GET /api/mobile/profile` - Get user profile (requires Bearer token)
- `PATCH /api/mobile/profile` - Update profile (requires Bearer token)

## Troubleshooting

### "Network request timed out"
- Check backend server is running on the correct port
- Verify IP address in `.env` matches your Mac's current IP
- Ensure firewall allows connections on port 3000
- Check both devices/simulator are on the same network

### "Unauthorized" errors
- Token may be expired (will be cleared automatically)
- Backend `NEXTAUTH_SECRET` may have changed
- Token format may be incorrect

### App stuck on loading
- Check backend server logs for errors
- Verify API_BASE URL is correct
- Check network connectivity
