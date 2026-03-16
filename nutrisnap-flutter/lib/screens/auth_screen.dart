import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../services/auth_storage.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.onSignedIn});

  final void Function(String token) onSignedIn;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _baseUrlCtrl = TextEditingController(text: 'http://127.0.0.1:3001');

  bool _isLogin = true;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _baseUrlCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    final api = ApiClient(baseUrl: _baseUrlCtrl.text.trim());
    try {
      if (_isLogin) {
        final token = await api.login(_emailCtrl.text.trim(), _passwordCtrl.text);
        await AuthStorage.saveToken(token);
        widget.onSignedIn(token);
      } else {
        await api.register(_emailCtrl.text.trim(), _passwordCtrl.text);
        setState(() => _isLogin = true);
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('NutriSnap Auth')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _baseUrlCtrl,
              decoration: const InputDecoration(labelText: 'Backend base URL'),
            ),
            TextField(
              controller: _emailCtrl,
              decoration: const InputDecoration(labelText: 'Email'),
            ),
            TextField(
              controller: _passwordCtrl,
              decoration: const InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            const SizedBox(height: 16),
            if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: Text(_loading ? 'Please wait...' : (_isLogin ? 'Login' : 'Register')),
            ),
            TextButton(
              onPressed: _loading ? null : () => setState(() => _isLogin = !_isLogin),
              child: Text(_isLogin
                  ? 'Need an account? Register'
                  : 'Already have an account? Login'),
            ),
          ],
        ),
      ),
    );
  }
}
