import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../api/dental_api.dart';
import '../models/models.dart';

enum AuthStatus { loading, authenticated, anonymous }

/// Holds the signed-in user and their token (AUTH-001, AUTH-002).
class AuthController extends ChangeNotifier {
  AuthController({required this.api, FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage() {
    api.client.onUnauthorized = _expire;
  }

  final DentalApi api;
  final FlutterSecureStorage _storage;

  static const String _tokenKey = 'dental_clinic_token';

  AuthStatus status = AuthStatus.loading;
  Me? user;

  /// True when the server rejected the stored token (revoked or deactivated).
  bool sessionExpired = false;

  /// Restores a session from the securely stored token.
  Future<void> restore() async {
    final token = await _storage.read(key: _tokenKey);
    if (token == null) {
      status = AuthStatus.anonymous;
      notifyListeners();
      return;
    }
    api.client.token = token;
    try {
      user = await api.me();
      status = AuthStatus.authenticated;
    } on Exception {
      await _clear();
    }
    notifyListeners();
  }

  /// Phone number + password login from a role-specific login screen.
  Future<Me> login(String phone, String password, Role role) async {
    final result = await api.login(phone, password, role);
    api.client.token = result.token;
    await _storage.write(key: _tokenKey, value: result.token);
    user = result.user;
    sessionExpired = false;
    status = AuthStatus.authenticated;
    notifyListeners();
    return result.user;
  }

  Future<void> logout() async {
    try {
      await api.logout();
    } on Exception {
      // The token is discarded locally even if the server cannot be reached.
    }
    await _clear();
    notifyListeners();
  }

  bool hasPerm(String permission) => user?.permissions.contains(permission) ?? false;

  Future<void> _clear() async {
    api.client.token = null;
    user = null;
    status = AuthStatus.anonymous;
    await _storage.delete(key: _tokenKey);
  }

  void _expire() {
    if (status != AuthStatus.authenticated) return;
    sessionExpired = true;
    _clear().then((_) => notifyListeners());
  }
}
