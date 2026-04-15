import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../theme/app_theme.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({
    super.key,
    required this.token,
    required this.apiClient,
  });

  final String token;
  final ApiClient apiClient;

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  late Future<List<dynamic>> _historyFuture;
  final _searchController = TextEditingController();
  List<dynamic> _allMeals = [];
  List<dynamic> _filteredMeals = [];

  @override
  void initState() {
    super.initState();
    _historyFuture = _loadHistory();
    _searchController.addListener(_filterMeals);
  }

  Future<List<dynamic>> _loadHistory() async {
    final meals = await widget.apiClient.fetchHistory(
      widget.token,
      limit: 50,
    );
    setState(() {
      _allMeals = meals;
      _filteredMeals = meals;
    });
    return meals;
  }

  void _filterMeals() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      if (query.isEmpty) {
        _filteredMeals = _allMeals;
      } else {
        _filteredMeals = _allMeals.where((meal) {
          final mealData = meal as Map<String, dynamic>;
          final analysis = (mealData['analysis'] as Map<String, dynamic>?) ?? {};
          final items = (analysis['items'] as List?) ?? const [];
          final firstItem =
              items.isNotEmpty && items.first is Map<String, dynamic>
                  ? items.first as Map<String, dynamic>
                  : <String, dynamic>{};
          final name = (mealData['meal_name'] ??
                  firstItem['name'] ??
                  mealData['meal_type'] ??
                  '')
              .toString()
              .toLowerCase();
          return name.contains(query);
        }).toList();
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: _historyFuture,
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
                    _historyFuture = _loadHistory();
                  }),
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: GlassPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SectionTitle(
                      title: 'Meal History',
                      subtitle: 'Browse previous meals and filter by name.',
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _searchController,
                      decoration: const InputDecoration(
                        hintText: 'Search meals...',
                        prefixIcon: Icon(Icons.search_rounded),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: _filteredMeals.isEmpty
                  ? Center(
                      child: Text(
                        _allMeals.isEmpty ? 'No meals yet' : 'No meals found',
                        style: const TextStyle(
                          color: NutriSnapColors.textSecondary,
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 120),
                      itemCount: _filteredMeals.length,
                      itemBuilder: (context, index) {
                        final meal = _filteredMeals[index] as Map<String, dynamic>;
                        return _buildMealCard(meal);
                      },
                    ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildMealCard(Map<String, dynamic> meal) {
    final analysis = (meal['analysis'] as Map<String, dynamic>?) ?? {};
    final items = (analysis['items'] as List?) ?? const [];
    final totalNutrition =
        (analysis['total_nutrition'] as Map<String, dynamic>?) ?? {};
    final firstItem = items.isNotEmpty && items.first is Map<String, dynamic>
        ? items.first as Map<String, dynamic>
        : <String, dynamic>{};
    final mealName = meal['meal_name'] ??
        firstItem['name'] ??
        meal['meal_type'] ??
        (meal['is_manual'] == true ? 'Manual Meal' : 'Meal');
    final mealDate = meal['meal_date'] ?? meal['timestamp'] ?? 'Unknown';
    final imageUrl = meal['image_url'];

    return GlassPanel(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  mealName.toString(),
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: NutriSnapColors.textPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                mealDate.toString(),
                style: const TextStyle(
                  fontSize: 12,
                  color: NutriSnapColors.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (imageUrl != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: Container(
                height: 150,
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
                        size: 50,
                        color: NutriSnapColors.textSecondary,
                      ),
                    );
                  },
                ),
              ),
            ),
          const SizedBox(height: 12),
          if (totalNutrition.isNotEmpty) ...[
            const Text(
              'Nutrition',
              style: TextStyle(fontSize: 12, color: NutriSnapColors.textSecondary),
            ),
            const SizedBox(height: 10),
            _buildNutritionRow(totalNutrition),
          ],
        ],
      ),
    );
  }

  Widget _buildNutritionRow(Map<String, dynamic> nutrition) {
    return Wrap(
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
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: NutriSnapColors.textPrimary,
            ),
          ),
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
