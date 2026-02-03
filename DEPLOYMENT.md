
# Deployment Guide - Retro Pong

This guide will help you deploy Retro Pong to the App Store (iOS) and Google Play Store (Android).

## Prerequisites

1. **EAS CLI**: Install Expo Application Services CLI
   ```bash
   npm install -g eas-cli
   ```

2. **Expo Account**: Create an account at https://expo.dev

3. **Apple Developer Account** (for iOS): $99/year
   - Enroll at https://developer.apple.com

4. **Google Play Developer Account** (for Android): $25 one-time fee
   - Register at https://play.google.com/console

## Initial Setup

### 1. Login to EAS

```bash
eas login
```

### 2. Configure Your Project

```bash
eas build:configure
```

This will create/update your `eas.json` file (already configured in this project).

## iOS Deployment

### Step 1: Update Bundle Identifier (if needed)

In `app.json`, update the iOS bundle identifier:
```json
"ios": {
  "bundleIdentifier": "com.yourcompany.retropong"
}
```

### Step 2: Build for iOS

```bash
# Build for App Store distribution
eas build --platform ios --profile production
```

This will:
- Create an optimized production build
- Generate an `.ipa` file
- Auto-increment the build number

### Step 3: Submit to App Store

```bash
eas submit --platform ios --profile production
```

You'll need to provide:
- Apple ID (email)
- App-specific password (generate at appleid.apple.com)
- App Store Connect app ID

### Step 4: App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Create a new app listing
3. Fill in app metadata:
   - **Name**: Retro Pong
   - **Category**: Games
   - **Description**: Classic Pong game with retro aesthetics
   - **Screenshots**: Take screenshots on various devices
   - **Privacy Policy**: Required (create one or use a template)
4. Submit for review

## Android Deployment

### Step 1: Update Package Name (if needed)

In `app.json`, update the Android package:
```json
"android": {
  "package": "com.yourcompany.retropong"
}
```

### Step 2: Build for Android

```bash
# Build APK for Google Play
eas build --platform android --profile production
```

This will:
- Create an optimized production build
- Generate an `.apk` or `.aab` file
- Auto-increment the version code

### Step 3: Submit to Google Play

```bash
eas submit --platform android --profile production
```

You'll need:
- Google Play Console service account key (JSON file)
- Track selection (internal, alpha, beta, or production)

### Step 4: Google Play Console

1. Go to https://play.google.com/console
2. Create a new app
3. Fill in app details:
   - **App name**: Retro Pong
   - **Category**: Games > Arcade
   - **Description**: Classic Pong game with modern features
   - **Screenshots**: Required for phone, tablet
   - **Feature graphic**: 1024x500 PNG
   - **Privacy Policy**: Required URL
4. Create a release and upload your APK/AAB
5. Submit for review

## Build Profiles Explained

### Development
```bash
eas build --platform ios --profile development
```
- For internal testing
- Includes development tools
- Faster build times

### Preview
```bash
eas build --platform ios --profile preview
```
- For beta testing
- Internal distribution
- Production-like build

### Production
```bash
eas build --platform ios --profile production
```
- For App Store/Google Play
- Fully optimized
- Release configuration

## Troubleshooting

### iOS Build Errors

**Error**: Invalid URL scheme
- **Fix**: Ensure `scheme` in `app.json` uses only lowercase letters, numbers, hyphens, and periods. No spaces!
- **Current**: `"scheme": "retro-pong"` ✅

**Error**: Missing bundle identifier
- **Fix**: Add `bundleIdentifier` to `ios` section in `app.json`

**Error**: Provisioning profile issues
- **Fix**: EAS handles this automatically. Ensure your Apple Developer account is active.

### Android Build Errors

**Error**: Invalid package name
- **Fix**: Package name must be lowercase with dots (e.g., `com.company.app`)

**Error**: Keystore issues
- **Fix**: EAS manages keystores automatically. Don't create manual keystores.

## Version Management

### Updating Version Numbers

In `app.json`:
```json
{
  "expo": {
    "version": "1.0.0",  // User-facing version (update for each release)
    "ios": {
      "buildNumber": "1"  // Auto-incremented by EAS
    },
    "android": {
      "versionCode": 1  // Auto-incremented by EAS
    }
  }
}
```

**Note**: With `autoIncrement: true` in `eas.json`, build numbers are managed automatically.

## Pre-Submission Checklist

### Required Assets

- [ ] App Icon (1024x1024 PNG, no transparency)
- [ ] Splash Screen (1242x2436 PNG for iOS, various for Android)
- [ ] Screenshots (at least 3 per platform)
- [ ] Feature Graphic (Android only, 1024x500 PNG)
- [ ] Privacy Policy URL

### App Store Requirements

- [ ] App name (max 30 characters)
- [ ] Subtitle (max 30 characters)
- [ ] Description (max 4000 characters)
- [ ] Keywords (max 100 characters, comma-separated)
- [ ] Support URL
- [ ] Marketing URL (optional)
- [ ] Age rating (complete questionnaire)

### Google Play Requirements

- [ ] Short description (max 80 characters)
- [ ] Full description (max 4000 characters)
- [ ] App category
- [ ] Content rating (complete questionnaire)
- [ ] Target audience
- [ ] Store listing contact details

## Testing Before Submission

### Internal Testing

```bash
# Build for internal distribution
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

Share the build with testers via:
- TestFlight (iOS)
- Internal testing track (Android)

### What to Test

- [ ] Game starts correctly
- [ ] Single player mode works
- [ ] Multiplayer mode works
- [ ] Pause/resume functionality
- [ ] Score tracking
- [ ] Win condition (first to 11)
- [ ] Visual effects toggle correctly
- [ ] Controls work (touch and keyboard)
- [ ] App doesn't crash
- [ ] Performance is smooth (60 FPS)

## Post-Submission

### Review Times

- **iOS**: 1-3 days typically
- **Android**: 1-7 days typically

### Common Rejection Reasons

1. **Missing Privacy Policy**: Required for both platforms
2. **Incomplete Metadata**: Fill all required fields
3. **Crashes**: Test thoroughly before submission
4. **Guideline Violations**: Review platform guidelines

### After Approval

1. Monitor crash reports
2. Respond to user reviews
3. Plan updates and new features
4. Track analytics (downloads, retention)

## Continuous Deployment

### Automated Builds

Set up GitHub Actions or similar CI/CD:

```yaml
# .github/workflows/build.yml
name: EAS Build
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: expo/expo-github-action@v7
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas build --platform all --non-interactive
```

## Support

- **Expo Documentation**: https://docs.expo.dev
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **EAS Submit**: https://docs.expo.dev/submit/introduction/

## Summary

Your Retro Pong game is **ready for deployment**! The critical URL scheme issue has been fixed, and all configurations are in place. Follow this guide to submit to the App Store and Google Play Store.

Good luck with your launch! 🚀
