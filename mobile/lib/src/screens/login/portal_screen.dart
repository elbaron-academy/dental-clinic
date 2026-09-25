import 'package:flutter/material.dart';

import '../../auth/roles.dart';
import '../../models/models.dart';
import 'login_screen.dart';

/// Lets the user choose the Doctor, Assistant or Receptionist login.
class PortalScreen extends StatelessWidget {
  const PortalScreen({super.key, this.sessionExpired = false});

  final bool sessionExpired;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: ListView(
              padding: const EdgeInsets.all(24),
              shrinkWrap: true,
              children: [
                Icon(Icons.medical_services_outlined, size: 56, color: theme.colorScheme.primary),
                const SizedBox(height: 12),
                Text('Dental Clinic', textAlign: TextAlign.center, style: theme.textTheme.headlineMedium),
                const SizedBox(height: 4),
                const Text('Choose your portal to sign in with your phone number.', textAlign: TextAlign.center),
                if (sessionExpired) ...[
                  const SizedBox(height: 12),
                  const Text('Your session ended. Please sign in again.', textAlign: TextAlign.center),
                ],
                const SizedBox(height: 24),
                for (final role in Role.values)
                  Card(
                    child: ListTile(
                      title: Text(role.label, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text(role.portalDescription),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(builder: (_) => LoginScreen(role: role)),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
