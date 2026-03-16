import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

class ApiClient {
  ApiClient({
    this.baseUrl = 'http://127.0.0.1:3001',
    http.Client? client,
  }) : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  Map<String, String> _headers({String? token}) {
    final headers = {'Content-Type': 'application/json'};
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<Map<String, dynamic>> register(String email, String password) async {
    final res = await _client.post(
      Uri.parse('$baseUrl/register'),
      headers: _headers(),
      body: jsonEncode({'email': email, 'password': password}),
    );
    _throwIfFailed(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<String> login(String email, String password) async {
    final res = await _client.post(
      Uri.parse('$baseUrl/login'),
      headers: _headers(),
      body: jsonEncode({'email': email, 'password': password}),
    );
    _throwIfFailed(res);
    final payload = jsonDecode(res.body) as Map<String, dynamic>;
    return payload['access_token'] as String;
  }

  Future<Map<String, dynamic>> fetchSummary(String token, {String? date}) async {
    final uri = Uri.parse('$baseUrl/summary').replace(
      queryParameters: date == null ? null : {'summary_date': date},
    );
    final res = await _client.get(uri, headers: _headers(token: token));
    _throwIfFailed(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<List<dynamic>> fetchHistory(String token, {int limit = 10}) async {
    final uri = Uri.parse('$baseUrl/history').replace(
      queryParameters: {'limit': '$limit'},
    );
    final res = await _client.get(uri, headers: _headers(token: token));
    _throwIfFailed(res);
    return (jsonDecode(res.body) as Map<String, dynamic>)['meals'] as List<dynamic>;
  }

  Future<Map<String, dynamic>> analyzeImage(
    String token,
    File image,
    String? cuisineHint,
  ) async {
    final req = http.MultipartRequest('POST', Uri.parse('$baseUrl/analyze'));
    req.headers['Authorization'] = 'Bearer $token';
    req.files.add(await http.MultipartFile.fromPath('image', image.path));
    if (cuisineHint != null && cuisineHint.trim().isNotEmpty) {
      req.fields['cuisine_hint'] = cuisineHint.trim();
    }

    final streamed = await req.send();
    final res = await http.Response.fromStream(streamed);
    _throwIfFailed(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  void _throwIfFailed(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    String message = 'Request failed (${res.statusCode})';
    try {
      final parsed = jsonDecode(res.body) as Map<String, dynamic>;
      message = parsed['detail']?.toString() ?? parsed['message']?.toString() ?? message;
    } catch (_) {}
    throw Exception(message);
  }
}
