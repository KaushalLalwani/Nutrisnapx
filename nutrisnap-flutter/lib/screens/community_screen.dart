import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../theme/app_theme.dart';

class CommunityScreen extends StatefulWidget {
  const CommunityScreen({
    super.key,
    required this.token,
    required this.apiClient,
  });

  final String token;
  final ApiClient apiClient;

  @override
  State<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends State<CommunityScreen> {
  late Future<List<dynamic>> _postsFuture;
  final _captionController = TextEditingController();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _postsFuture = widget.apiClient.fetchCommunity(widget.token);
  }

  Future<void> _sharePost() async {
    if (_captionController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add a caption')),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Post creation needs an image upload and is not wired in this Flutter screen yet.',
        ),
      ),
    );
  }

  @override
  void dispose() {
    _captionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: _postsFuture,
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
                    _postsFuture = widget.apiClient.fetchCommunity(widget.token);
                  }),
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        final posts = snapshot.data ?? [];

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: GlassPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SectionTitle(
                      title: 'Community',
                      subtitle:
                          'Share quick updates and browse the latest meal posts.',
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _captionController,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        hintText: 'Share your meal...',
                        prefixIcon: Icon(Icons.forum_rounded),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: _loading ? null : _sharePost,
                        icon: _loading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.share_rounded),
                        label: const Text('Share Post'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: posts.isEmpty
                  ? const Center(
                      child: Text(
                        'No posts yet',
                        style: TextStyle(color: NutriSnapColors.textSecondary),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: () {
                        setState(() {
                          _postsFuture = widget.apiClient.fetchCommunity(
                            widget.token,
                          );
                        });
                        return _postsFuture;
                      },
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 120),
                        itemCount: posts.length,
                        itemBuilder: (context, index) {
                          final post = posts[index] as Map<String, dynamic>;
                          return _buildPostCard(post);
                        },
                      ),
                    ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildPostCard(Map<String, dynamic> post) {
    final nutrition = (post['nutrition'] as Map<String, dynamic>?) ?? {};
    final author =
        post['author_email'] ?? post['user_email'] ?? post['username'] ?? 'Unknown';
    final imageUrl = post['image_url'];

    return GlassPanel(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    colors: [
                      NutriSnapColors.accent,
                      NutriSnapColors.accentStrong,
                    ],
                  ),
                ),
                child: const Icon(Icons.person_rounded, color: Colors.black),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      author.toString(),
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: NutriSnapColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      post['created_at']?.toString().split('.')[0] ?? '',
                      style: const TextStyle(
                        fontSize: 12,
                        color: NutriSnapColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (imageUrl != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: Container(
                height: 200,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: const Color(0x661E293B),
                  border: Border.all(color: NutriSnapColors.border),
                ),
                child: Image.network(
                  imageUrl.toString(),
                  fit: BoxFit.cover,
                  loadingBuilder: (context, child, progress) {
                    if (progress == null) return child;
                    return const Center(child: CircularProgressIndicator());
                  },
                  errorBuilder: (context, error, stackTrace) {
                    return const Center(
                      child: Icon(
                        Icons.broken_image_outlined,
                        size: 60,
                        color: NutriSnapColors.textSecondary,
                      ),
                    );
                  },
                ),
              ),
            ),
          if (imageUrl != null) const SizedBox(height: 16),
          if (post['caption'] != null)
            Text(
              post['caption'],
              style: const TextStyle(
                fontSize: 14,
                color: NutriSnapColors.textPrimary,
                height: 1.5,
              ),
            ),
          if (post['caption'] != null) const SizedBox(height: 16),
          if (post['meal_name'] != null || nutrition.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0x661E293B),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: NutriSnapColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Post Details',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: NutriSnapColors.textPrimary,
                    ),
                  ),
                  if (post['meal_name'] != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      post['meal_name'].toString(),
                      style: const TextStyle(color: NutriSnapColors.textSecondary),
                    ),
                  ],
                  if (nutrition.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        _buildNutrientTag(
                          'Calories',
                          '${nutrition['calories'] ?? 0}',
                          'kcal',
                        ),
                        _buildNutrientTag(
                          'Protein',
                          '${nutrition['protein'] ?? 0}',
                          'g',
                        ),
                        _buildNutrientTag(
                          'Carbs',
                          '${nutrition['carbs'] ?? 0}',
                          'g',
                        ),
                        _buildNutrientTag(
                          'Fats',
                          '${nutrition['fat'] ?? nutrition['fats'] ?? 0}',
                          'g',
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildNutrientTag(String label, String value, String unit) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0x80111827),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: NutriSnapColors.border),
      ),
      child: Column(
        children: [
          Text(
            '$value$unit',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: NutriSnapColors.textPrimary,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              color: NutriSnapColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
