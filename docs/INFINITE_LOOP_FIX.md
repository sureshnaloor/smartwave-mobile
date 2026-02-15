# Infinite Loop Fix - API GET Requests

## Problem

The app was making infinite GET `/api/mobile/profile` requests, causing the backend server to be overwhelmed.

## Root Causes

1. **AuthContext** was validating tokens multiple times
2. **HomeScreen** was fetching profile multiple times for the same token
3. **ProfilePermissionsContext** updates were causing re-renders that triggered fetches
4. No guards against duplicate API calls

## Solutions Implemented

### 1. AuthContext Guards
- Added `isInitializingRef` to prevent multiple validation runs
- Added `lastValidatedTokenRef` to skip re-validation of the same token
- Reset refs on signOut

### 2. HomeScreen Guards
- Added `lastFetchedTokenRef` to prevent duplicate fetches for the same token
- Added `lastCanEditRef` to prevent unnecessary `setCanEditProfile` calls
- Double-check token hasn't changed before updating state

### 3. ProfilePermissionsContext Optimization
- Memoized `setCanEditProfile` with `useCallback`
- Memoized context value with `useMemo`
- Only update when value actually changes

## Testing

After these fixes:
1. Sign in - should see ONE profile fetch
2. Navigate around - no duplicate requests
3. Check terminal - no infinite GET requests

## If Still Seeing Loops

Check browser console for:
- Which component is triggering the requests
- If token is changing unexpectedly
- If components are mounting/unmounting repeatedly

Add temporary logging:
```typescript
console.log('[HomeScreen] useEffect triggered', { token, lastFetched: lastFetchedTokenRef.current });
```
