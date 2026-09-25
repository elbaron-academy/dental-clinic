import 'package:flutter/material.dart';

import '../models/models.dart';

/// Doctor selection (CLINIC-002 / CLINIC-003): the only permitted doctor is
/// selected automatically; otherwise the user chooses one.
class DoctorPicker extends StatelessWidget {
  const DoctorPicker({
    super.key,
    required this.doctors,
    required this.value,
    required this.onChanged,
    this.errorText,
  });

  final List<DoctorSummary> doctors;
  final int? value;
  final ValueChanged<int?> onChanged;
  final String? errorText;

  @override
  Widget build(BuildContext context) {
    if (doctors.isEmpty) {
      return Text(
        'You are not assigned to any doctor. Ask an administrator.',
        style: TextStyle(color: Theme.of(context).colorScheme.error),
      );
    }
    if (doctors.length == 1) {
      return InputDecorator(
        decoration: const InputDecoration(labelText: 'Doctor'),
        child: Text('${doctors.first.fullName} (selected automatically)'),
      );
    }
    return DropdownButtonFormField<int>(
      value: value,
      decoration: InputDecoration(labelText: 'Doctor *', errorText: errorText),
      items: [
        for (final doctor in doctors)
          DropdownMenuItem(value: doctor.id, child: Text(doctor.fullName)),
      ],
      onChanged: onChanged,
    );
  }
}

/// The doctor id to send: the chosen one, or the only permitted doctor.
int? resolveDoctor(List<DoctorSummary> doctors, int? value) =>
    value ?? (doctors.length == 1 ? doctors.first.id : null);
