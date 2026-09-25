import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/dental_api.dart';
import '../../auth/auth_controller.dart';
import '../../models/models.dart';
import '../../utils/format.dart';
import '../../widgets/appointment_tile.dart';
import '../../widgets/common.dart';
import '../home/home_shell.dart';
import 'appointment_form_screen.dart';

/// Appointments of one day, filtered by doctor.
class AppointmentListScreen extends StatefulWidget {
  const AppointmentListScreen({super.key});

  @override
  State<AppointmentListScreen> createState() => _AppointmentListScreenState();
}

class _AppointmentListScreenState extends State<AppointmentListScreen> {
  DateTime _day = DateTime.now();
  int? _doctor;
  List<Appointment>? _appointments;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final range = localDay(_day);
    try {
      final page = await context.read<DentalApi>().appointments(from: range.from, to: range.to, doctor: _doctor);
      if (mounted) {
        setState(() {
          _appointments = page.results;
          _error = null;
        });
      }
    } on Exception catch (error) {
      if (mounted) setState(() => _error = error);
    }
  }

  Future<void> _pickDay() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _day,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 730)),
    );
    if (picked != null) {
      setState(() => _day = picked);
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final doctors = auth.user!.permittedDoctors;
    return Scaffold(
      appBar: AppBar(title: const Text('Appointments'), actions: const [AccountMenu()]),
      floatingActionButton: auth.hasPerm('appointments.add_appointment')
          ? FloatingActionButton(
              tooltip: 'New appointment',
              onPressed: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => const AppointmentFormScreen()),
                );
                await _load();
              },
              child: const Icon(Icons.add),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 96),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: Wrap(
                spacing: 12,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  OutlinedButton.icon(
                    onPressed: _pickDay,
                    icon: const Icon(Icons.calendar_today, size: 18),
                    label: Text(formatLongDate(_day)),
                  ),
                  if (doctors.length > 1)
                    DropdownButton<int?>(
                      value: _doctor,
                      items: [
                        const DropdownMenuItem<int?>(value: null, child: Text('All my doctors')),
                        for (final doctor in doctors)
                          DropdownMenuItem<int?>(value: doctor.id, child: Text(doctor.fullName)),
                      ],
                      onChanged: (value) {
                        setState(() => _doctor = value);
                        _load();
                      },
                    ),
                ],
              ),
            ),
            if (_error != null) ErrorView(error: _error!, onRetry: _load),
            if (_appointments == null && _error == null)
              const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator())),
            if (_appointments != null)
              SectionCard(
                title: '${_appointments!.length} appointment${_appointments!.length == 1 ? '' : 's'}',
                child: _appointments!.isEmpty
                    ? const EmptyText('No appointments for this day.')
                    : Column(
                        children: [
                          for (final a in _appointments!) AppointmentTile(appointment: a, onChanged: _load),
                        ],
                      ),
              ),
          ],
        ),
      ),
    );
  }
}
