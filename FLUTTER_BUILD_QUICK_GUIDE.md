# 🚀 NutriSnap Flutter - Quick Build Reference

## Pre-Build Checklist

- [ ] Flutter SDK installed (`flutter --version`)
- [ ] Android SDK configured
- [ ] Backend running on port 3001
- [ ] API endpoint configured in `lib/core/config.dart`

---

## 🔨 Build Commands

### Android Debug Build
```bash
cd nutrisnap-flutter
flutter pub get
flutter build apk --debug
```
**Output:** `build/app/outputs/flutter-apk/app-debug.apk`

### Android Release Build
```bash
flutter build apk --release
```
**Output:** `build/app/outputs/flutter-apk/app-release.apk`

### Android App Bundle (Google Play)
```bash
flutter build appbundle --release
```
**Output:** `build/app/outputs/bundle/release/app-release.aab`

### iOS Build (macOS only)
```bash
flutter build ios --release
```
**Output:** `build/ios/iphoneos/Runner.app`

---

## 🏃 Running the App

### Run on Emulator/Device
```bash
flutter run
```

### Run Release Build
```bash
flutter run --release
```

### Run with Device Logs
```bash
flutter run -v
```

---

## 📱 Features Summary

| Feature | Endpoint | Status |
|---------|----------|--------|
| Login/Register | `/register`, `/login` | ✅ |
| Dashboard | `/summary` | ✅ |
| Meal Analysis | `/analyze` | ✅ |
| History | `/history` | ✅ |
| Goals | `/goals` | ✅ |
| Community | `/community` | ✅ |
| Profile | `/profile` | ✅ |

---

## ⚙️ Configuration Steps

### 1. Update API Endpoint
Edit: `lib/core/config.dart`
```dart
// For development:
static const String defaultBaseUrl = 'http://10.0.2.2:3001';  // Emulator
static const String defaultBaseUrl = 'http://192.168.x.x:3001'; // Device

// For production:
static const String defaultBaseUrl = 'https://api.nutrisnap.io';
```

### 2. Update App Package ID (Optional)
**Android:** `android/app/build.gradle.kts`
```kotlin
applicationId = "com.yourcompany.nutrisnap"
```

**iOS:** `ios/Runner/Info.plist`
```xml
<key>CFBundleIdentifier</key>
<string>com.yourcompany.nutrisnap</string>
```

---

## 🔍 Verify Build

After build succeeds:

```bash
# List build outputs
ls -lh build/app/outputs/

# Check APK
file build/app/outputs/flutter-apk/app-release.apk

# Install on device (Android)
adb install build/app/outputs/flutter-apk/app-release.apk
```

---

## 🐛 Troubleshooting

### Clean Build
```bash
flutter clean
flutter pub get
flutter build apk --release
```

### Check Flutter Status
```bash
flutter doctor
```

### View Detailed Logs
```bash
flutter build apk --release -v
```

### Android NDK Issue
```bash
flutter pub get
flutter build apk --debug
```

---

## 📤 Distribution

### Google Play Store
1. Create Google Play Developer account
2. Create app in Play Console
3. Upload AAB: `build/app/outputs/bundle/release/app-release.aab`
4. Fill store listing
5. Submit for review

### App Store (iOS)
1. Create Apple Developer account
2. Create app in App Store Connect
3. Build and upload IPA
4. Fill app information
5. Submit for review

### Direct Distribution
- Share APK: `build/app/outputs/flutter-apk/app-release.apk`
- Device users can sideload APK file

---

## 📊 App Info

- **Name:** NutriSnap
- **Version:** 0.1.0
- **Build:** 1
- **Min SDK:** 21 (Android)
- **Target SDK:** 34 (Android)
- **iOS Minimum:** 11.0

---

## 🎯 Production Checklist

- [ ] Update API endpoint to production
- [ ] Increase build version number
- [ ] Test on multiple devices
- [ ] Run full test suite
- [ ] Check all error handling
- [ ] Verify offline behavior
- [ ] Test on slow network
- [ ] Generate release APK/IPA
- [ ] Sign APK with release key
- [ ] Upload to app store
- [ ] Monitor crash reports

---

## 📞 Quick Links

- **Flutter Docs:** https://flutter.dev/docs
- **Pub.dev:** https://pub.dev
- **Android Build:** https://developer.android.com/build
- **iOS Build:** https://developer.apple.com/build

---

**Last Updated:** March 2026
**Maintained by:** NutriSnap Team
