import 'package:intl/intl.dart';

final DateFormat _dateTime = DateFormat('EEE d MMM, HH:mm');
final DateFormat _time = DateFormat('HH:mm');
final DateFormat _longDate = DateFormat('EEEE d MMMM y');

String formatDateTime(DateTime? value) => value == null ? '—' : _dateTime.format(value);

String formatTime(DateTime? value) => value == null ? '—' : _time.format(value);

String formatLongDate(DateTime value) => _longDate.format(value);

/// Money travels as decimal strings; show two decimals.
String formatMoney(String? value) {
  if (value == null || value.isEmpty) return '—';
  final number = double.tryParse(value);
  return number == null ? value : number.toStringAsFixed(2);
}

/// Start (inclusive) and end (exclusive) of the local day containing [day].
({DateTime from, DateTime to}) localDay(DateTime day) {
  final start = DateTime(day.year, day.month, day.day);
  return (from: start, to: DateTime(day.year, day.month, day.day + 1));
}
