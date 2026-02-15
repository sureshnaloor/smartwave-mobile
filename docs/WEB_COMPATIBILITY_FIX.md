# Web Compatibility Fix - Skia Error

## Problem

When running `npm run web`, the app showed a blank page with error:
```
TypeError: undefined is not an object (evaluating 'this.CanvasKit.TypefaceFontProvider')
```

This happened because `@shopify/react-native-skia` is a native-only library and doesn't work on web.

## Solution

Updated `src/components/CardExportCanvas.tsx` to:

1. **Conditionally import Skia** - Only loads Skia on native platforms (iOS/Android)
2. **Web-safe fallbacks** - Returns `null` on web, preventing crashes
3. **Graceful degradation** - Skia-dependent features (card export) won't work on web, but the app won't crash

## Changes Made

- Skia imports are now conditional (only on native)
- Canvas components return `null` on web
- `useImage` and `matchFont` calls are guarded with null checks

## Testing

The app should now:
- ✅ Load in web browser without errors
- ✅ Show passes screen and other UI
- ⚠️ Card export features won't work on web (native-only)

## Next Steps

For full testing of card export features, use:
- **Expo Go** on a physical device
- **Development build** on iOS/Android

Web is fine for testing passes, navigation, and general UI.
