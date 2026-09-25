import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'auth/auth_controller.dart';
import 'screens/home/home_shell.dart';
import 'screens/login/portal_screen.dart';

class DentalClinicApp extends StatefulWidget {
  const DentalClinicApp({super.key});

  @override
  State<DentalClinicApp> createState() => _DentalClinicAppState();
}

class _DentalClinicAppState extends State<DentalClinicApp> {
  final _navigatorKey = GlobalKey<NavigatorState>();
  late final AuthController _auth = context.read<AuthController>();

  @override
  void initState() {
    super.initState();
    _auth.addListener(_onAuthChanged);
  }

  @override
  void dispose() {
    _auth.removeListener(_onAuthChanged);
    super.dispose();
  }

  /// After logout or an expired session, close every screen above the gate.
  void _onAuthChanged() {
    if (_auth.status == AuthStatus.anonymous) {
      _navigatorKey.currentState?.popUntil((route) => route.isFirst);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Dental Clinic',
      navigatorKey: _navigatorKey,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0F766E)),
        useMaterial3: true,
        inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder()),
      ),
      home: const AuthGate(),
    );
  }
}

/// Role-aware routing: anonymous users pick a portal, signed-in users land on
/// their role's home (AUTH-002).
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    switch (auth.status) {
      case AuthStatus.loading:
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      case AuthStatus.anonymous:
        return PortalScreen(sessionExpired: auth.sessionExpired);
      case AuthStatus.authenticated:
        return HomeShell(key: ValueKey(auth.user!.id));
    }
  }
}
