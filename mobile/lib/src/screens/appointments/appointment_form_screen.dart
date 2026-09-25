import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/dental_api.dart';
import '../../auth/auth_controller.dart';
import '../../models/models.dart';
import '../../widgets/common.dart';
import '../../widgets/date_time_field.dart';
import '../../widgets/doctor_picker.dart';

/// Reception creates an appointment for a patient and doctor (APPT-001).
class AppointmentFormScreen extends StatefulWidget {
  const AppointmentFormScreen({super.key, this.patient});

  final PatientSummary? patient;

  @override
  State<AppointmentFormScreen> createState() => _AppointmentFormScreenState();
}

class _AppointmentFormScreenState extends State<AppointmentFormScreen> {
  late PatientSummary? _patient = widget.patient;
  int? _doctor;
  DateTime _when = nextQuarterHour();
  final _notes = TextEditingController();
  final _search = TextEditingController();
  Timer? _debounce;
  List<Patient> _results = const [];
  bool _checkInNow = false;
  bool _pending = false;
  ApiException? _apiError;

  @override
  void dispose() {
    _debounce?.cancel();
    _notes.dispose();
    _search.dispose();
    super.dispose();
  }

  void _onSearch(String value) {
    _debounce?.cancel();
    if (value.trim().length < 2) {
      setState(() => _results = const []);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 250), () async {
      if (!mounted) return;
      try {
        final page = await context.read<DentalApi>().patients(search: value.trim());
        if (mounted) setState(() => _results = page.results.take(8).toList());
      } on Exception catch (error) {
        if (mounted) showError(context, error);
      }
    });
  }

  Future<void> _submit() async {
    final doctors = context.read<AuthController>().user!.permittedDoctors;
    final doctorId = resolveDoctor(doctors, _doctor);
    final patient = _patient;
    if (patient == null || doctorId == null) {
      showMessage(context, patient == null ? 'Select a patient.' : 'Select a doctor.');
      return;
    }
    final api = context.read<DentalApi>();
    setState(() {
      _pending = true;
      _apiError = null;
    });
    try {
      var appointment = await api.createAppointment(
        patientId: patient.id,
        doctorId: doctorId,
        scheduledAt: _when,
        notes: _notes.text.trim(),
      );
      if (_checkInNow) appointment = await api.checkIn(appointment.id);
      if (mounted) Navigator.of(context).pop(appointment);
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _apiError = error;
        _pending = false;
      });
      showError(context, error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final patient = _patient;
    return Scaffold(
      appBar: AppBar(title: const Text('New appointment')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (patient != null)
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(patient.fullName),
              subtitle: Text(patient.phone),
              trailing: widget.patient == null
                  ? TextButton(onPressed: () => setState(() => _patient = null), child: const Text('Change'))
                  : null,
            )
          else ...[
            TextField(
              controller: _search,
              onChanged: _onSearch,
              decoration: InputDecoration(
                labelText: 'Patient *',
                hintText: 'Type at least 2 characters of name or phone',
                prefixIcon: const Icon(Icons.search),
                errorText: _apiError?.field('patient_id'),
              ),
            ),
            for (final result in _results)
              ListTile(
                title: Text(result.fullName),
                subtitle: Text(result.phone),
                onTap: () => setState(() {
                  _patient = result;
                  _results = const [];
                }),
              ),
          ],
          const SizedBox(height: 12),
          DoctorPicker(
            doctors: auth.user!.permittedDoctors,
            value: _doctor,
            onChanged: (value) => setState(() => _doctor = value),
            errorText: _apiError?.field('doctor_id'),
          ),
          const SizedBox(height: 12),
          DateTimeField(
            label: 'Date and time *',
            value: _when,
            onChanged: (value) => setState(() => _when = value),
            errorText: _apiError?.field('scheduled_at'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _notes,
            maxLines: 2,
            decoration: const InputDecoration(labelText: 'Notes (optional)'),
          ),
          if (auth.hasPerm('appointments.check_in_appointment'))
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Patient is here now (walk-in): check in immediately'),
              value: _checkInNow,
              onChanged: (value) => setState(() => _checkInNow = value),
            ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _pending ? null : _submit,
            child: Text(_pending ? 'Saving…' : 'Create appointment'),
          ),
        ],
      ),
    );
  }
}
