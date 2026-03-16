import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../services/api_client.dart';
import '../widgets/macro_tile.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.token, required this.onSignOut});

  final String token;
  final Future<void> Function() onSignOut;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _baseUrlCtrl = TextEditingController(text: 'http://127.0.0.1:3001');
  final _cuisineHintCtrl = TextEditingController();
  final _picker = ImagePicker();

  int _index = 0;
  bool _loading = false;
  Map<String, dynamic>? _summary;
  List<dynamic> _history = [];
  Map<String, dynamic>? _analysis;
  String? _error;

  ApiClient get _api => ApiClient(baseUrl: _baseUrlCtrl.text.trim());

  @override
  void initState() {
    super.initState();
    _refreshData();
  }

  @override
  void dispose() {
    _baseUrlCtrl.dispose();
    _cuisineHintCtrl.dispose();
    super.dispose();
  }

  Future<void> _refreshData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final summary = await _api.fetchSummary(widget.token);
      final history = await _api.fetchHistory(widget.token, limit: 10);
      if (!mounted) return;
      setState(() {
        _summary = summary;
        _history = history;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pickAndAnalyze() async {
    final picked = await _picker.pickImage(source: ImageSource.gallery);
    if (picked == null) return;

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _api.analyzeImage(
        widget.token,
        File(picked.path),
        _cuisineHintCtrl.text,
      );
      if (!mounted) return;
      setState(() => _analysis = res);
      await _refreshData();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _dashboardTab() {
    final totals = (_summary?['totals'] as Map<String, dynamic>?) ?? {};
    final goals = (_summary?['goals'] as Map<String, dynamic>?) ?? {};
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        if (_error != null)
          Text(_error!, style: const TextStyle(color: Colors.red)),
        MacroTile(
          label: 'Calories',
          value: (totals['calories'] ?? 0) as num,
          goal: (goals['daily_calories'] ?? 1) as num,
        ),
        MacroTile(
          label: 'Protein',
          value: (totals['protein'] ?? 0) as num,
          goal: (goals['protein_g'] ?? 1) as num,
        ),
        MacroTile(
          label: 'Carbs',
          value: (totals['carbs'] ?? 0) as num,
          goal: (goals['carbs_g'] ?? 1) as num,
        ),
        MacroTile(
          label: 'Fat',
          value: (totals['fat'] ?? 0) as num,
          goal: (goals['fat_g'] ?? 1) as num,
        ),
      ],
    );
  }

  Widget _analyzeTab() {
    final totalNutrition = ((_analysis?['analysis'] as Map<String, dynamic>?)?['total_nutrition']
            as Map<String, dynamic>?) ??
        {};
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        TextField(
          controller: _cuisineHintCtrl,
          decoration: const InputDecoration(labelText: 'Cuisine hint (optional)'),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _loading ? null : _pickAndAnalyze,
          icon: const Icon(Icons.photo),
          label: const Text('Select image and analyze'),
        ),
        if (_analysis != null) ...[
          const SizedBox(height: 16),
          Text('Latest analysis', style: Theme.of(context).textTheme.titleMedium),
          Text('Calories: ${totalNutrition['calories'] ?? 0}'),
          Text('Protein: ${totalNutrition['protein'] ?? 0} g'),
          Text('Carbs: ${totalNutrition['carbs'] ?? 0} g'),
          Text('Fat: ${totalNutrition['fat'] ?? 0} g'),
        ],
      ],
    );
  }

  Widget _historyTab() {
    return ListView.builder(
      itemCount: _history.length,
      itemBuilder: (context, i) {
        final meal = _history[i] as Map<String, dynamic>;
        final total = ((meal['analysis'] as Map<String, dynamic>)['total_nutrition']
            as Map<String, dynamic>);
        final status = meal['status'] ?? 'unknown';
        return ListTile(
          title: Text(meal['meal_type']?.toString() ?? 'Meal #${i + 1}'),
          subtitle: Text(
            'Calories ${total['calories'] ?? 0} • Protein ${total['protein'] ?? 0}g • $status',
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final tabs = [_dashboardTab(), _analyzeTab(), _historyTab()];
    return Scaffold(
      appBar: AppBar(
        title: const Text('NutriSnap Mobile'),
        actions: [
          IconButton(onPressed: _loading ? null : _refreshData, icon: const Icon(Icons.refresh)),
          IconButton(
            onPressed: () async => widget.onSignOut(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _baseUrlCtrl,
              decoration: const InputDecoration(
                labelText: 'Backend base URL',
                border: OutlineInputBorder(),
              ),
              onSubmitted: (_) => _refreshData(),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : tabs[_index],
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.camera_alt), label: 'Analyze'),
          NavigationDestination(icon: Icon(Icons.history), label: 'History'),
        ],
      ),
    );
  }
}
