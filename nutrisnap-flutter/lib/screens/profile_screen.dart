import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../services/auth_storage.dart';
import '../theme/app_theme.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({
    super.key,
    required this.token,
    required this.apiClient,
    required this.onSignOut,
  });

  final String token;
  final ApiClient apiClient;
  final Future<void> Function() onSignOut;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late Future<Map<String, dynamic>> _profileFuture;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _profileFuture = widget.apiClient.fetchProfile(widget.token);
  }

  Future<void> _handleSignOut() async {
    setState(() => _loading = true);
    try {
      await AuthStorage.clearToken();
      if (mounted) {
        await widget.onSignOut();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sign out failed: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>>(
      future: _profileFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('Error: ${snapshot.error}'),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => setState(() {
                    _profileFuture = widget.apiClient.fetchProfile(widget.token);
                  }),
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        final profile = snapshot.data ?? {};
        final email = profile['email'] ?? 'Unknown';

        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
          children: [
            const SectionTitle(
              title: 'Profile',
              subtitle: 'Account details and your NutriSnap activity snapshot.',
            ),
            const SizedBox(height: 20),
            Center(
              child: Container(
                width: 104,
                height: 104,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [
                      NutriSnapColors.accent,
                      NutriSnapColors.accentStrong,
                    ],
                  ),
                ),
                child: const Icon(
                  Icons.person_rounded,
                  size: 56,
                  color: Colors.black,
                ),
              ),
            ),
            const SizedBox(height: 24),
            GlassPanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Email',
                    style: TextStyle(
                      fontSize: 12,
                      color: NutriSnapColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    email,
                    style: const TextStyle(
                      fontSize: 16,
                      color: NutriSnapColors.textPrimary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            GlassPanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Statistics',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 16),
                  _buildStatRow(
                    'Total Posts',
                    '${profile['total_posts'] ?? 0}',
                  ),
                  const SizedBox(height: 10),
                  _buildStatRow(
                    'Total Likes',
                    '${profile['total_likes'] ?? 0}',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loading ? null : _handleSignOut,
              icon: const Icon(Icons.logout_rounded),
              label: _loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Sign Out'),
              style: ElevatedButton.styleFrom(
                backgroundColor: NutriSnapColors.danger,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildStatRow(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0x661E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: NutriSnapColors.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(color: NutriSnapColors.textSecondary),
          ),
          Text(
            value,
            style: const TextStyle(
              color: NutriSnapColors.textPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
