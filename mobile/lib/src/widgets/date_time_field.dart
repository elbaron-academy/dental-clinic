import 'package:flutter/material.dart';

import '../utils/format.dart';

/// A date + time picker field in local time.
class DateTimeField extends StatelessWidget {
  const DateTimeField({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.errorText,
    this.firstDate,
  });

  final String label;
  final DateTime value;
  final ValueChanged<DateTime> onChanged;
  final String? errorText;
  final DateTime? firstDate;

  Future<void> _pick(BuildContext context) async {
    final date = await showDatePicker(
      context: context,
      initialDate: value,
      firstDate: firstDate ?? DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 730)),
    );
    if (date == null || !context.mounted) return;
    final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(value));
    if (time == null) return;
    onChanged(DateTime(date.year, date.month, date.day, time.hour, time.minute));
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => _pick(context),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          errorText: errorText,
          suffixIcon: const Icon(Icons.event),
        ),
        child: Text(formatDateTime(value)),
      ),
    );
  }
}

/// The next quarter hour from now, a sensible default for new appointments.
DateTime nextQuarterHour([DateTime? from]) {
  final now = from ?? DateTime.now();
  final minutes = ((now.minute + 1) / 15).ceil() * 15;
  return DateTime(now.year, now.month, now.day, now.hour).add(Duration(minutes: minutes));
}
