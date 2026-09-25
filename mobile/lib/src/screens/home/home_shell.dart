import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../auth/auth_controller.dart';
import '../appointments/appointment_list_screen.dart';
import '../patients/patient_list_screen.dart';
import 'dashboard_screen.dart';

/// Bottom navigation limited to what the user's permissions allow.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final user = auth.user!;
    final tabs = <({String label, IconData icon, Widget screen})>[
      (label: 'Home', icon: Icons.home_outlined, screen: DashboardScreen(role: user.role)),
      if (auth.hasPerm('patients.view_patient'))
        (label: 'Patients', icon: Icons.people_outline, screen: const PatientListScreen()),
      if (auth.hasPerm('appointments.view_appointment'))
        (label: 'Appointments', icon: Icons.event_outlined, screen: const AppointmentListScreen()),
    ];
    final index = _index < tabs.length ? _index : 0;

    return Scaffold(
      body: IndexedStack(index: index, children: [for (final tab in tabs) tab.screen]),
      bottomNavigationBar: tabs.length < 2
          ? null
          : NavigationBar(
              selectedIndex: index,
              onDestinationSelected: (value) => setState(() => _index = value),
              destinations: [
                for (final tab in tabs) NavigationDestination(icon: Icon(tab.icon), label: tab.label),
              ],
            ),
    );
  }
}

/// App bar actions shared by the tab screens: who is signed in, and logout.
class AccountMenu extends StatelessWidget {
  const AccountMenu({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final user = auth.user;
    if (user == null) return const SizedBox.shrink();
    return PopupMenuButton<String>(
      icon: const Icon(Icons.account_circle_outlined),
      onSelected: (value) {
        if (value == 'logout') auth.logout();
      },
      itemBuilder: (context) => [
        PopupMenuItem<String>(
          enabled: false,
          child: Text('${user.fullName}\n${user.roleDisplay} · ${user.clinic.name}'),
        ),
        const PopupMenuDivider(),
        const PopupMenuItem<String>(value: 'logout', child: Text('Log out')),
      ],
    );
  }
}
