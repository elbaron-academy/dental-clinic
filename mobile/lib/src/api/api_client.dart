import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

/// An error returned by the Dental Clinic API (see docs/API.md).
class ApiException implements Exception {
  ApiException(
    this.statusCode,
    this.message, {
    this.code,
    Map<String, List<String>>? fieldErrors,
  }) : fieldErrors = fieldErrors ?? const {};

  /// HTTP status; 0 when the server could not be reached.
  final int statusCode;
  final String message;

  /// Machine-readable code, e.g. `active_visit_exists` or `role_mismatch`.
  final String? code;
  final Map<String, List<String>> fieldErrors;

  /// First validation message for [name], if any.
  String? field(String name) {
    final errors = fieldErrors[name];
    return errors == null || errors.isEmpty ? null : errors.first;
  }

  @override
  String toString() => message;
}

/// Thin JSON-over-HTTP client with token authentication.
class ApiClient {
  ApiClient({required this.baseUrl, http.Client? httpClient})
      : _http = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _http;

  /// DRF token; sent as `Authorization: Token <token>`.
  String? token;

  /// Called when an authenticated request is rejected with 401.
  void Function()? onUnauthorized;

  static const Duration _timeout = Duration(seconds: 30);

  Uri uri(String path, [Map<String, Object?>? query]) {
    final params = <String, String>{};
    query?.forEach((key, value) {
      if (value != null && value.toString().isNotEmpty) {
        params[key] = value.toString();
      }
    });
    final base = Uri.parse(baseUrl);
    final basePath = base.path.endsWith('/')
        ? base.path.substring(0, base.path.length - 1)
        : base.path;
    return base.replace(
      path: '$basePath/api$path',
      queryParameters: params.isEmpty ? null : params,
    );
  }

  Future<dynamic> get(String path, {Map<String, Object?>? query}) =>
      _send('GET', path, query: query);

  Future<dynamic> post(String path, [Object? body]) =>
      _send('POST', path, body: body);

  Future<dynamic> patch(String path, Object body) =>
      _send('PATCH', path, body: body);

  Future<dynamic> delete(String path) => _send('DELETE', path);

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, Object?>? query,
    Object? body,
  }) async {
    final request = http.Request(method, uri(path, query));
    request.headers['Accept'] = 'application/json';
    final currentToken = token;
    if (currentToken != null) {
      request.headers['Authorization'] = 'Token $currentToken';
    }
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }

    http.Response response;
    try {
      final streamed = await _http.send(request).timeout(_timeout);
      response = await http.Response.fromStream(streamed).timeout(_timeout);
    } on TimeoutException {
      throw ApiException(
        0,
        'The server took too long to respond. Please try again.',
        code: 'timeout',
      );
    } on Exception {
      throw ApiException(
        0,
        'Cannot reach the server. Check your connection and try again.',
        code: 'network_error',
      );
    }

    dynamic data;
    if (response.bodyBytes.isNotEmpty) {
      try {
        data = jsonDecode(utf8.decode(response.bodyBytes));
      } on FormatException {
        data = null;
      }
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    }
    if (response.statusCode == 401 && currentToken != null) {
      onUnauthorized?.call();
    }
    throw _toException(response.statusCode, data);
  }

  ApiException _toException(int status, dynamic data) {
    final body = data is Map<String, dynamic> ? data : const <String, dynamic>{};
    final fieldErrors = <String, List<String>>{};
    body.forEach((key, value) {
      if (key == 'detail' || key == 'code') return;
      if (value is List) {
        fieldErrors[key] = value.map((e) => e.toString()).toList();
      } else if (value is String) {
        fieldErrors[key] = [value];
      }
    });
    String message;
    if (body['detail'] is String) {
      message = body['detail'] as String;
    } else if (fieldErrors['non_field_errors'] != null) {
      message = fieldErrors['non_field_errors']!.first;
    } else if (fieldErrors.isNotEmpty) {
      message = 'Please correct the highlighted fields.';
    } else {
      message = _defaultMessage(status);
    }
    return ApiException(
      status,
      message,
      code: body['code'] is String ? body['code'] as String : null,
      fieldErrors: fieldErrors,
    );
  }

  static String _defaultMessage(int status) {
    if (status == 403) return 'You do not have permission to do this.';
    if (status == 404) return 'Not found.';
    if (status == 429) {
      return 'Too many attempts. Please wait a minute and try again.';
    }
    if (status >= 500) return 'The server had a problem. Please try again.';
    return 'Request failed ($status).';
  }
}
