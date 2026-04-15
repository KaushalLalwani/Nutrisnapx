# NutriSnap Flutter Mobile App - Build Guide

## 📱 App Overview

The NutriSnap Flutter mobile app is a feature-rich nutrition tracking application that mirrors the frontend web client. It provides meal analysis, nutrition tracking, goal setting, and community features.

## ✨ Features Implemented

### 1. **Dashboard (Home)**
- Daily nutrition summary (Calories, Protein, Carbs, Fats)
- Visual progress indicators with percentage tracking
- Color-coded nutrition bars (Green: on track, Orange: caution, Red: over)
- Refresh to fetch latest data
- Quick access to meal analysis

### 2. **Meal Analysis**
- Camera/gallery image picker
- Optional cuisine hint
- Real-time AI analysis via Gemini API
- Detailed nutrition breakdown
- Macro nutrient display

### 3. **History**
- View all past meal scans
- Search meals by name
- Date and nutrition info per meal
- Scrollable history list
- Pull-to-refresh

### 4. **Nutrition Goals**
- Set daily targets for Calories, Protein, Carbs, Fats
- Quick template selection (Balanced, High Protein, Low Carb, Athletic)
- Edit individual goals
- Real-time goal updates

### 5. **Community**
- View community meal posts
- Share meal analysis with custom captions
- See other users' meals and nutrition
- Pull-to-refresh feed

### 6. **User Profile**
- View user email and statistics
- Total meals analyzed
- Total community posts
- Sign out functionality

## 🏗️ Project Structure

```
lib/
├── main.dart                 # App entry point
├── core/
│   ├── config.dart          # API configuration
│   └── exceptions.dart      # Custom exception classes
├── screens/
│   ├── auth_screen.dart     # Login/Register
│   ├── home_screen.dart     # Dashboard & navigation
│   ├── analyze_screen.dart  # Meal analysis (already exists)
│   ├── history_screen.dart  # Meal history
│   ├── goals_screen.dart    # Nutrition goals
│   ├── community_screen.dart # Community feed
│   └── profile_screen.dart  # User profile
├── services/
│   ├── api_client.dart      # API client (enhanced)
│   └── auth_storage.dart    # Token persistence
└── widgets/
    └── macro_tile.dart      # Nutrition progress widget
```

## 🚀 Building the App

### Prerequisites

1. **Flutter SDK** (3.3+)
   ```bash
   flutter --version
   ```

2. **Android SDK** (for Android builds)
   - Android SDK 21+
   - Android NDK

3. **Running Backend**
   ```bash
   cd nutrisnap/
   python -m uvicorn app.main:app --reload --port 3001
   ```

### Build Steps

#### Step 1: Get Dependencies
```bash
cd nutrisnap-flutter
flutter pub get
```

#### Step 2: Build for Android

**Debug Build (Development)**
```bash
flutter build apk --debug
```

**Release Build (Production)**
```bash
flutter build apk --release
```

**Output:** `build/app/outputs/flutter-apk/app-release.apk`

#### Step 3: Build for iOS (macOS only)
```bash
flutter build ios --release
```

**Output:** `build/ios/iphoneos/Runner.app`

#### Step 4: Run on Device/Emulator
```bash
# List available devices
flutter devices

# Run debug app
flutter run

# Run release app
flutter run --release
```

## ⚙️ Configuration

### Update API Endpoint

Edit `lib/core/config.dart`:
```dart
static const String defaultBaseUrl = 'http://127.0.0.1:3001';
```

**For different environments:**
- **Development (Emulator):** `http://10.0.2.2:3001`
- **Development (Physical Device):** `http://192.168.x.x:3001`
- **Production:** `https://api.nutrisnap.io`

### Update App Name & Package ID

1. **Android:** Edit `android/app/build.gradle.kts`:
   ```kotlin
   applicationId = "com.example.nutrisnap_flutter"
   ```

2. **iOS:** Edit `ios/Runner/Info.plist`:
   ```xml
   <key>CFBundleIdentifier</key>
   <string>com.example.nutrisnap</string>
   ```

## 📋 Enhanced API Client Features

The updated `ApiClient` includes:

1. **All Endpoints**
   - Auth: `register`, `login`
   - Summary: `fetchSummary`
   - History: `fetchHistory`
   - Analyze: `analyzeImage`
   - Profile: `fetchProfile`, `updateProfile`
   - Goals: `fetchGoals`, `updateGoals`
   - Community: `fetchCommunity`, `sharePost`

2. **Error Handling**
   - Custom exception types (NetworkException, AuthException, ServerException)
   - Timeout handling (30 second default)
   - Automatic retry logic
   - User-friendly error messages

3. **Network Resilience**
   - Connection timeout detection
   - Socket exception handling
   - Request timeout with fallback

## 🔐 Security

1. **Token Management**
   - JWT tokens stored securely in `shared_preferences`
   - Automatic token refresh on auth failure
   - Token cleared on sign out

2. **API Security**
   - Bearer token authentication
   - HTTPS support for production
   - Custom header validation

## 📦 Dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.8
  http: ^1.2.2
  shared_preferences: ^2.2.3
  image_picker: ^1.1.2
```

## 🧪 Testing

### Run Tests
```bash
flutter test
```

### Test on Emulator
```bash
# Start Android emulator
emulator -avd Pixel_4_API_30

# List running emulators
flutter emulators

# Run app
flutter run
```

## 🔄 Hot Reload / Hot Restart

**Hot Reload** (preserves state):
```bash
r
```

**Hot Restart** (resets state):
```bash
R
```

**Full Rebuild:**
```bash
flutter run --no-fast-start
```

## 🚀 Release Checklist

- [ ] Update version in `pubspec.yaml`
- [ ] Update app name (if needed)
- [ ] Test on multiple devices
- [ ] Update API endpoint for production
- [ ] Generate signed APK/IPA
- [ ] Create Google Play/App Store listings
- [ ] Submit for review

## 📝 Build Output

After successful build:

**APK:** `build/app/outputs/flutter-apk/app-release.apk`
**App Bundle:** `build/app/outputs/bundle/release/app-release.aab`

## 🛠️ Troubleshooting

### "Flutter SDK not found"
```bash
flutter doctor
```

### "Android API level not found"
```bash
flutter doctor --android-licenses
```

### "Dependencies not resolving"
```bash
flutter pub get
flutter pub upgrade
```

### "Device not showing"
```bash
flutter devices -v
adb kill-server
adb start-server
```

## 📞 Support

For issues or questions:
1. Check [Flutter documentation](https://flutter.dev)
2. Review backend logs: `nutrisnap/`
3. Check network connectivity to backend
4. Verify API endpoint configuration

---

**Last Updated:** March 2026
**NutriSnap Version:** 0.1.0
