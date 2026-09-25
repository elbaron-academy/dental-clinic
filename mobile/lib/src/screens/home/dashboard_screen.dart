import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/dental_api.dart';
import '../../auth/auth_controller.dart';
import '../../auth/roles.dart';
import '../../models/models.dart';
import '../../utils/format.dart';
import '../../widgets/appointment_tile.dart';
import '../../widgets/common.dart';
import '../appointments/appointment_form_screen.dart';
import '../patients/patient_form_screen.dart';
import 'home_shell.dart';

/// Role home: queue, visits in progress and today's appointments (APPT-003).
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, required this.role});

  final Role role;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int? _doctor;
  ClinicQueue? _queue;
  List<Appointment>? _today;
  Object? _error;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final api = context.read<DentalApi>();
    final day = localDay(DateTime.now());
    try {
      final results = await Future.wait([
        api.queue(doctor: _doctor),
        api.appointments(from: day.from, to: day.to, doctor: _doctor),
      ]);
      if (!mounted) return;
      setState(() {
        _queue = results[0] as ClinicQueue;
        _today = (results[1] as PageResult<Appointment>).results;
        _error = null;
      });
    } on Exception catch (error) {
      if (mounted) setState(() => _error = error);
    }
  }

  Future<void> _open(Widget screen) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final user = auth.user!;
    final role = widget.role;
    final queue = _queue;

    return Scaffold(
      appBar: AppBar(
        title: Text(role.homeTitle),
        actions: [
          if (auth.hasPerm('patients.add_patient'))
            IconButton(
              tooltip: 'Register patient',
              icon: const Icon(Icons.person_add_alt),
              onPressed: () => _open(const PatientFormScreen()),
            ),
          const AccountMenu(),
        ],
      ),
      floatingActionButton: auth.hasPerm('appointments.add_appointment')
          ? FloatingActionButton.extended(
              onPressed: () => _open(const AppointmentFormScreen()),
              icon: const Icon(Icons.add),
              label: const Text('New appointment'),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 96),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Text('${user.clinic.name} · ${formatLongDate(DateTime.now())}'),
            ),
            if (user.permittedDoctors.length > 1)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                child: DropdownButtonFormField<int?>(
                  value: _doctor,
                  decoration: const InputDecoration(labelText: 'Doctor'),
                  items: [
                    const DropdownMenuItem<int?>(value: null, child: Text('All my doctors')),
                    for (final doctor in user.permittedDoctors)
                      DropdownMenuItem<int?>(value: doctor.id, child: Text(doctor.fullName)),
                  ],
                  onChanged: (value) {
                    setState(() => _doctor = value);
                    _load();
                  },
                ),
              ),
            if (user.permittedDoctors.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('You are not assigned to any doctor yet. Ask an administrator.'),
              ),
            if (_error != null) ErrorView(error: _error!, onRetry: _load),
            if (queue == null && _error == null)
              const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              ),
            if (queue != null) ...[
              SectionCard(
                title: '${role.waitingTitle} (${queue.waiting.length})',
                child: queue.waiting.isEmpty
                    ? const EmptyText('Nobody is waiting.')
                    : Column(
                        children: [
                          for (final a in queue.waiting)
                            AppointmentTile(appointment: a, onChanged: _load, useCheckInTime: true),
                        ],
                      ),
              ),
              SectionCard(
                title: '${role.inVisitTitle} (${queue.inVisit.length})',
                child: queue.inVisit.isEmpty
                    ? const EmptyText('No visits in progress.')
                    : Column(
                        children: [
                          for (final a in queue.inVisit) AppointmentTile(appointment: a, onChanged: _load),
                        ],
                      ),
              ),
            ],
            if (_today != null)
              SectionCard(
                title: "Today's appointments",
                child: _today!.isEmpty
                    ? const EmptyText('No appointments today.')
                    : Column(
                        children: [
                          for (final a in _today!) AppointmentTile(appointment: a, onChanged: _load),
                        ],
                      ),
              ),
          ],
        ),
      ),
    );
  }
}
