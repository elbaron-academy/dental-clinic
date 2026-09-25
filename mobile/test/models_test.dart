// Written for when Flutter testing is enabled by the Team Leader.
// NOT executed in the current MVP (see skills/flutter/SKILL.md).
import 'package:dental_clinic/src/api/api_client.dart';
import 'package:dental_clinic/src/models/models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses the /api/auth/me/ contract', () {
    final me = Me.fromJson({
      'id': 1,
      'phone': '01000000004',
      'full_name': 'Rana Adel',
      'role': 'RECEPTIONIST',
      'role_display': 'Receptionist',
      'clinic': {'id': 1, 'name': 'Smile Dental Center', 'doctor_count': 2},
      'permissions': ['patients.add_patient'],
      'permitted_doctors': [
        {'id': 10, 'full_name': 'Dr. Amal Hassan'},
      ],
    });
    expect(me.role, Role.receptionist);
    expect(me.permissions.contains('patients.add_patient'), isTrue);
    expect(me.permittedDoctors.single.fullName, 'Dr. Amal Hassan');
  });

  test('parses an appointment with billing', () {
    final appointment = Appointment.fromJson({
      'id': 5,
      'patient': {'id': 7, 'full_name': 'Hany', 'phone': '0111', 'is_minor': false},
      'doctor': {'id': 10, 'full_name': 'Dr. Amal'},
      'scheduled_at': '2026-09-25T10:00:00Z',
      'status': 'CHECKED_IN',
      'status_display': 'Waiting for doctor',
      'notes': '',
      'follow_up_of': null,
      'visit_id': null,
      'billing': {
        'amount_due': '400.00',
        'amount_paid': '150.00',
        'remaining_amount': '250.00',
        'payment_status': 'PENDING',
        'payment_status_display': 'Payment pending',
      },
      'checked_in_at': '2026-09-25T09:55:00Z',
      'cancelled_at': null,
      'created_at': '2026-09-25T08:00:00Z',
    });
    expect(appointment.status, AppointmentStatus.checkedIn);
    expect(appointment.billing!.remaining, 250);
  });

  test('builds API URLs under /api', () {
    final client = ApiClient(baseUrl: 'https://clinic.example.com/');
    expect(
      client.uri('/appointments/', {'status': 'SCHEDULED', 'doctor': null}).toString(),
      'https://clinic.example.com/api/appointments/?status=SCHEDULED',
    );
  });
}
