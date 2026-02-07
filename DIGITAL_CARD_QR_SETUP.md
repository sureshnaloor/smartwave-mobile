# Digital Card & QR Code Screens - Setup Guide

## Overview

Two new native iOS screens have been added to the SmartWave mobile app:

1. **DigitalCardScreen** - Interactive digital business card with flip animation and themes
2. **QRCodeScreen** - QR code generator with size options and save/share functionality

Both screens work entirely within the iOS app - no browser required!

## Installation

First, install the required dependencies:

```bash
cd /Users/sureshmenon/Desktop/nextjsapps/smartwave/smartwave-mobile
npm install
```

The following packages have been added to `package.json`:
- `react-native-qrcode-svg` - QR code generation
- `react-native-view-shot` - Capture views as images
- `expo-media-library` - Save images to photo library

## Features

### DigitalCardScreen (`src/screens/DigitalCardScreen.tsx`)

- **Flip Animation**: Tap the card to flip between front and back
- **Multiple Themes**: 
  - SmartWave (blue gradient)
  - Minimal (beige/cream)
  - Professional (white with blue border)
- **Front Side**: Shows name, title, company, address, contact info, and photo
- **Back Side**: Shows QR code with company logo overlay
- **Save Card**: Saves both front and back as images to Photos app
- **Share Card**: Share the card via iOS share sheet

### QRCodeScreen (`src/screens/QRCodeScreen.tsx`)

- **QR Code Generation**: Creates vCard format QR code from profile data
- **Size Options**: Small (200px), Medium (300px), Large (400px)
- **Logo Overlay**: Optional company logo in center of QR code
- **Save to Photos**: Save QR code as PNG image
- **Share**: Share QR code via iOS share sheet

## Navigation

Both screens are accessible from:
- **HomeScreen** (retail/self-managed users): "View Digital Card" and "View QR Code" buttons
- **EmployeeHomeScreen** (corporate employees): Same buttons at the bottom

The screens are added to the navigation stack in `App.tsx`:
- Route: `DigitalCard`
- Route: `QRCode`

## Usage

1. **From Home Screen**:
   - Tap "View Digital Card" to see your interactive card
   - Tap "View QR Code" to see your QR code
   
2. **In Digital Card Screen**:
   - Tap the card to flip between front and back
   - Tap "Change Theme" to cycle through themes
   - Tap "Save Card" to save both sides to Photos
   - Tap "Share" to share the front side

3. **In QR Code Screen**:
   - Select size (Small/Medium/Large)
   - Tap "Save to Photos" to save the QR code
   - Tap "Share" to share the QR code

## Technical Details

### vCard Generation
- Helper function in `src/utils/vcard.ts`
- Generates standard vCard 3.0 format
- Includes: name, title, company, emails, phones, website, address

### Image Capture
- Uses `react-native-view-shot` to capture views as PNG
- High quality (quality: 1.0) for crisp images
- Saves to iOS Photos app via `expo-media-library`

### Permissions
- iOS will prompt for photo library access when saving
- Permission is requested automatically on first save

## Testing

1. Run the app:
   ```bash
   npm run ios
   ```

2. Sign in with a user account that has a profile

3. Navigate to Home screen

4. Tap "View Digital Card" or "View QR Code"

5. Test the features:
   - Flip the card
   - Change themes
   - Save images
   - Share functionality

## Notes

- QR codes use vCard format for maximum compatibility
- Error correction level is set to "H" (highest) for logo overlay support
- Card dimensions maintain 3.5:2 aspect ratio (standard business card)
- All images are saved at high quality for printing/sharing
