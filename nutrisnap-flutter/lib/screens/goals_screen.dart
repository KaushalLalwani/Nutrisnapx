import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../theme/app_theme.dart';

class GoalsScreen extends StatefulWidget {
  const GoalsScreen({
    super.key,
    required this.token,
    required this.apiClient,
  });

  final String token;
  final ApiClient apiClient;

  @override
  State<GoalsScreen> createState() => _GoalsScreenState();
}

class _GoalsScreenState extends State<GoalsScreen> {
  late Future<Map<String, dynamic>> _goalsFuture;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _goalsFuture = widget.apiClient.fetchGoals(widget.token);
  }

  Future<void> _updateGoal(String goalType, num value) async {
    setState(() => _loading = true);
    try {
      await widget.apiClient.updateGoals(
        widget.token,
        {goalType: value},
      );
      setState(() {
        _goalsFuture = widget.apiClient.fetchGoals(widget.token);
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Goal updated successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>>(
      future: _goalsFuture,
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
                    _goalsFuture = widget.apiClient.fetchGoals(widget.token);
                  }),
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        final goals = snapshot.data ?? {};

        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
          children: [
            const SectionTitle(
              title: 'Nutrition Goals',
              subtitle: 'Edit your daily targets or apply a ready-made template.',
            ),
            const SizedBox(height: 16),
            _buildGoalCard(
              label: 'Daily Calories',
              value: goals['daily_calories']?.toString() ?? '2000',
              unit: 'kcal',
              onEdit: () => _showEditDialog(
                'Daily Calories',
                goals['daily_calories']?.toString() ?? '2000',
                (value) => _updateGoal('daily_calories', int.parse(value)),
              ),
            ),
            const SizedBox(height: 12),

              // Protein
            _buildGoalCard(
              label: 'Daily Protein',
              value: goals['protein_g']?.toString() ?? '50',
              unit: 'g',
              onEdit: () => _showEditDialog(
                'Daily Protein',
                goals['protein_g']?.toString() ?? '50',
                (value) => _updateGoal('protein_g', int.parse(value)),
              ),
            ),
              const SizedBox(height: 12),

              // Carbs
            _buildGoalCard(
              label: 'Daily Carbs',
              value: goals['carbs_g']?.toString() ?? '250',
              unit: 'g',
              onEdit: () => _showEditDialog(
                'Daily Carbs',
                goals['carbs_g']?.toString() ?? '250',
                (value) => _updateGoal('carbs_g', int.parse(value)),
              ),
            ),
              const SizedBox(height: 12),

              // Fats
            _buildGoalCard(
              label: 'Daily Fats',
              value: goals['fat_g']?.toString() ?? '70',
              unit: 'g',
              onEdit: () => _showEditDialog(
                'Daily Fats',
                goals['fat_g']?.toString() ?? '70',
                (value) => _updateGoal('fat_g', int.parse(value)),
              ),
            ),
              const SizedBox(height: 24),
              Text(
                'Quick Templates',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 1.2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                children: [
                  _buildTemplate('Balanced', {
                    'daily_calories': 2000,
                    'protein_g': 50,
                    'carbs_g': 250,
                    'fat_g': 70,
                  }),
                  _buildTemplate('High Protein', {
                    'daily_calories': 2200,
                    'protein_g': 110,
                    'carbs_g': 220,
                    'fat_g': 73,
                  }),
                  _buildTemplate('Low Carb', {
                    'daily_calories': 1800,
                    'protein_g': 90,
                    'carbs_g': 100,
                    'fat_g': 90,
                  }),
                  _buildTemplate('Athletic', {
                    'daily_calories': 2500,
                    'protein_g': 125,
                    'carbs_g': 300,
                    'fat_g': 83,
                  }),
                ],
              ),
          ],
        );
      },
    );
  }

  Widget _buildGoalCard({
    required String label,
    required String value,
    required String unit,
    required VoidCallback onEdit,
  }) {
    return GlassPanel(
      margin: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 14,
                  color: NutriSnapColors.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '$value $unit',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: NutriSnapColors.textPrimary,
                ),
              ),
            ],
          ),
          IconButton.filledTonal(
            onPressed: _loading ? null : onEdit,
            icon: const Icon(Icons.edit_rounded),
            tooltip: 'Edit',
            color: Colors.black,
            style: IconButton.styleFrom(
              backgroundColor: NutriSnapColors.accent,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTemplate(
    String name,
    Map<String, int> values,
  ) {
    return GestureDetector(
      onTap: _loading ? null : () => _applyTemplate(name, values),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: NutriSnapColors.border),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xCC0F172A),
              Color(0xB3122437),
            ],
          ),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                name,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: NutriSnapColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              const Icon(
                Icons.auto_awesome_rounded,
                color: NutriSnapColors.accent,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showEditDialog(
    String title,
    String currentValue,
    Function(String) onSave,
  ) {
    final controller = TextEditingController(text: currentValue);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            hintText: 'Enter value',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              onSave(controller.text);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> _applyTemplate(
    String templateName,
    Map<String, int> values,
  ) async {
    setState(() => _loading = true);
    try {
      await widget.apiClient.updateGoals(widget.token, values);
      setState(() {
        _goalsFuture = widget.apiClient.fetchGoals(widget.token);
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Applied $templateName template')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }
}
