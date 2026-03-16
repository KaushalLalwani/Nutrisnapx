import 'package:flutter/material.dart';

import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';
import 'services/auth_storage.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const NutriSnapApp());
}

class NutriSnapApp extends StatefulWidget {
  const NutriSnapApp({super.key});

  @override
  State<NutriSnapApp> createState() => _NutriSnapAppState();
}

class _NutriSnapAppState extends State<NutriSnapApp> {
  bool _loading = true;
  String? _token;

  @override
  void initState() {
    super.initState();
    _loadToken();
  }

  Future<void> _loadToken() async {
    final token = await AuthStorage.getToken();
    if (!mounted) return;
    setState(() {
      _token = token;
      _loading = false;
    });
  }

  void _onSignedIn(String token) {
    setState(() => _token = token);
  }

  Future<void> _onSignOut() async {
    await AuthStorage.clearToken();
    if (!mounted) return;
    setState(() => _token = null);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'NutriSnap',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.green),
        useMaterial3: true,
      ),
      home: _loading
          ? const Scaffold(body: Center(child: CircularProgressIndicator()))
          : (_token == null
                ? AuthScreen(onSignedIn: _onSignedIn)
                : HomeScreen(token: _token!, onSignOut: _onSignOut)),
    );
  }
}
