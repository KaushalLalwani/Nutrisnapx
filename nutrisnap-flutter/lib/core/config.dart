/// Configuration for NutriSnap mobile app
class AppConfig {
  /// Base URL for the backend API
  /// Change this based on your environment
  /// - Development (emulator): http://10.0.2.2:3001
  /// - Development (physical device): http://192.168.x.x:3001
  /// - Production: https://api.nutrisnap.io
  static const String defaultBaseUrl = 'http://127.0.0.1:3001';
  static const String googleWebClientId = String.fromEnvironment(
    'GOOGLE_WEB_CLIENT_ID',
    defaultValue: '',
  );
  
  // API Endpoints
  static const String registerEndpoint = '/register';
  static const String loginEndpoint = '/login';
  static const String googleAuthEndpoint = '/auth/google';
  static const String summaryEndpoint = '/summary';
  static const String historyEndpoint = '/history';
  static const String analyzeEndpoint = '/analyze';
  static const String profileEndpoint = '/profile/me';
  static const String goalsEndpoint = '/goals';
  static const String communityEndpoint = '/community/feed';
  static const String communityPostEndpoint = '/community/post';
  
  // App Settings
  static const String appName = 'NutriSnap';
  static const String appVersion = '0.1.0';
  
  // Constraints
  static const int connectionTimeout = 30; // seconds
  static const int receiveTimeout = 30; // seconds
  static const int retryAttempts = 3;
}
