import '../models/models.dart';

/// Texts for the role-specific login screens and home dashboards.
extension RoleTexts on Role {
  String get portalDescription => switch (this) {
        Role.doctor => 'Your queue, active visits and patient history.',
        Role.assistant => 'Patients and queues of the doctors you assist.',
        Role.receptionist => 'Registration, appointments, check-in and payments.',
      };

  String get homeTitle => switch (this) {
        Role.doctor => 'My day',
        Role.assistant => 'Clinic overview',
        Role.receptionist => 'Reception',
      };

  String get waitingTitle => this == Role.doctor ? 'My queue' : 'Waiting for doctor';

  String get inVisitTitle => this == Role.doctor ? 'My active visits' : 'In visit';
}
