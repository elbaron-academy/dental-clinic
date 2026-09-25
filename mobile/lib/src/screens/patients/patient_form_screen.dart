import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/dental_api.dart';
import '../../auth/auth_controller.dart';
import '../../models/models.dart';
import '../../widgets/common.dart';
import '../../widgets/doctor_picker.dart';

/// Registration and editing (PATIENT-001..003, CLINIC-002/003).
class PatientFormScreen extends StatefulWidget {
  const PatientFormScreen({super.key, this.patient});

  /// When set, the screen edits this patient instead of registering a new one.
  final Patient? patient;

  @override
  State<PatientFormScreen> createState() => _PatientFormScreenState();
}

class _PatientFormScreenState extends State<PatientFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.patient?.fullName);
  late final _phone = TextEditingController(text: widget.patient?.phone);
  late final _address = TextEditingController(text: widget.patient?.address);
  late final _guardianName = TextEditingController(text: widget.patient?.guardianName);
  late final _guardianPhone = TextEditingController(text: widget.patient?.guardianPhone);
  late bool _isMinor = widget.patient?.isMinor ?? false;
  int? _doctor;
  ApiException? _apiError;
  bool _pending = false;

  @override
  void dispose() {
    for (final controller in [_name, _phone, _address, _guardianName, _guardianPhone]) {
      controller.dispose();
    }
    super.dispose();
  }

  String? _required(String? value, String message) =>
      (value == null || value.trim().isEmpty) ? message : null;

  Future<void> _submit() async {
    final doctors = context.read<AuthController>().user!.permittedDoctors;
    final doctorId = resolveDoctor(doctors, _doctor);
    final valid = _formKey.currentState!.validate();
    if (!valid || (widget.patient == null && doctorId == null)) {
      if (doctorId == null && widget.patient == null) showMessage(context, 'Select a doctor.');
      return;
    }
    setState(() {
      _pending = true;
      _apiError = null;
    });
    final input = PatientInput(
      fullName: _name.text.trim(),
      phone: _phone.text.trim(),
      address: _address.text.trim(),
      isMinor: _isMinor,
      guardianName: _isMinor ? _guardianName.text.trim() : '',
      guardianPhone: _isMinor ? _guardianPhone.text.trim() : '',
      doctorIds: doctorId == null ? null : [doctorId],
    );
    final api = context.read<DentalApi>();
    try {
      final existing = widget.patient;
      final saved = existing == null
          ? await api.createPatient(input)
          : await api.updatePatient(existing.id, input);
      if (mounted) Navigator.of(context).pop(saved);
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _apiError = error;
        _pending = false;
      });
      if (error.fieldErrors.isEmpty) showError(context, error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final doctors = context.watch<AuthController>().user!.permittedDoctors;
    final isNew = widget.patient == null;
    return Scaffold(
      appBar: AppBar(title: Text(isNew ? 'Register patient' : 'Edit patient')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _name,
              decoration: InputDecoration(labelText: 'Full name *', errorText: _apiError?.field('full_name')),
              textCapitalization: TextCapitalization.words,
              validator: (value) => _required(value, 'Full name is required.'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(labelText: 'Phone number *', errorText: _apiError?.field('phone')),
              validator: (value) => _required(value, 'Phone number is required.'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _address,
              maxLines: 2,
              decoration: InputDecoration(labelText: 'Address (optional)', errorText: _apiError?.field('address')),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Patient is a minor'),
              value: _isMinor,
              onChanged: (value) => setState(() => _isMinor = value),
            ),
            if (_isMinor) ...[
              TextFormField(
                controller: _guardianName,
                decoration: InputDecoration(
                  labelText: 'Guardian name *',
                  errorText: _apiError?.field('guardian_name'),
                ),
                validator: (value) => _required(value, 'Guardian name is required for a minor.'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _guardianPhone,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: 'Guardian phone *',
                  errorText: _apiError?.field('guardian_phone'),
                ),
                validator: (value) => _required(value, 'Guardian phone is required for a minor.'),
              ),
              const SizedBox(height: 12),
            ],
            if (isNew)
              DoctorPicker(
                doctors: doctors,
                value: _doctor,
                onChanged: (value) => setState(() => _doctor = value),
                errorText: _apiError?.field('doctor_ids'),
              ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _pending ? null : _submit,
              child: Text(_pending ? 'Saving…' : (isNew ? 'Register patient' : 'Save changes')),
            ),
          ],
        ),
      ),
    );
  }
}
