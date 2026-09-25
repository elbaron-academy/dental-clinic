import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../auth/auth_controller.dart';
import '../../auth/roles.dart';
import '../../models/models.dart';
import '../../widgets/common.dart';

/// Role-specific login (Doctor / Assistant / Receptionist) with phone number
/// and password only (AUTH-001, AUTH-003). The API refuses other roles (CR-003).
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.role});

  final Role role;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  bool _pending = false;
  bool _obscure = true;
  Object? _error;

  @override
  void dispose() {
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _pending = true;
      _error = null;
    });
    try {
      await context.read<AuthController>().login(_phone.text.trim(), _password.text, widget.role);
      if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _error = error;
          _pending = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final role = widget.role;
    return Scaffold(
      appBar: AppBar(title: Text('${role.label} sign in')),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(24),
                shrinkWrap: true,
                children: [
                  Text(role.portalDescription, textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  if (_error != null) ...[
                    Text(
                      errorText(_error!),
                      style: TextStyle(color: Theme.of(context).colorScheme.error),
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextFormField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    autofillHints: const [AutofillHints.telephoneNumber, AutofillHints.username],
                    decoration: const InputDecoration(labelText: 'Phone number'),
                    textInputAction: TextInputAction.next,
                    validator: (value) =>
                        (value == null || value.trim().isEmpty) ? 'Enter your phone number.' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _password,
                    obscureText: _obscure,
                    autofillHints: const [AutofillHints.password],
                    decoration: InputDecoration(
                      labelText: 'Password',
                      suffixIcon: IconButton(
                        icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                    onFieldSubmitted: (_) => _submit(),
                    validator: (value) =>
                        (value == null || value.isEmpty) ? 'Enter your password.' : null,
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _pending ? null : _submit,
                    child: Text(_pending ? 'Signing in…' : 'Sign in'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
