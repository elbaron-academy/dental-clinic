// Data models mirroring docs/API.md (approved API contract v1).

typedef Json = Map<String, dynamic>;

DateTime? _date(Object? value) =>
    value == null ? null : DateTime.parse(value as String).toLocal();

List<T> _list<T>(Object? value, T Function(Json json) parse) =>
    (value as List<dynamic>? ?? const [])
        .map((item) => parse(item as Json))
        .toList();

enum Role {
  doctor('DOCTOR', 'Doctor'),
  assistant('ASSISTANT', 'Assistant'),
  receptionist('RECEPTIONIST', 'Receptionist');

  const Role(this.apiValue, this.label);

  final String apiValue;
  final String label;

  static Role fromApi(String value) =>
      Role.values.firstWhere((role) => role.apiValue == value);
}

class DoctorSummary {
  const DoctorSummary({required this.id, required this.fullName});

  factory DoctorSummary.fromJson(Json json) => DoctorSummary(
        id: json['id'] as int,
        fullName: json['full_name'] as String,
      );

  final int id;
  final String fullName;
}

class ClinicSummary {
  const ClinicSummary({
    required this.id,
    required this.name,
    required this.doctorCount,
  });

  factory ClinicSummary.fromJson(Json json) => ClinicSummary(
        id: json['id'] as int,
        name: json['name'] as String,
        doctorCount: json['doctor_count'] as int,
      );

  final int id;
  final String name;
  final int doctorCount;
}

class Me {
  const Me({
    required this.id,
    required this.phone,
    required this.fullName,
    required this.role,
    required this.roleDisplay,
    required this.clinic,
    required this.permissions,
    required this.permittedDoctors,
  });

  factory Me.fromJson(Json json) => Me(
        id: json['id'] as int,
        phone: json['phone'] as String,
        fullName: json['full_name'] as String,
        role: Role.fromApi(json['role'] as String),
        roleDisplay: json['role_display'] as String,
        clinic: ClinicSummary.fromJson(json['clinic'] as Json),
        permissions: (json['permissions'] as List<dynamic>).cast<String>().toSet(),
        permittedDoctors: _list(json['permitted_doctors'], DoctorSummary.fromJson),
      );

  final int id;
  final String phone;
  final String fullName;
  final Role role;
  final String roleDisplay;
  final ClinicSummary clinic;
  final Set<String> permissions;
  final List<DoctorSummary> permittedDoctors;
}

class PatientSummary {
  const PatientSummary({
    required this.id,
    required this.fullName,
    required this.phone,
    required this.isMinor,
  });

  factory PatientSummary.fromJson(Json json) => PatientSummary(
        id: json['id'] as int,
        fullName: json['full_name'] as String,
        phone: json['phone'] as String,
        isMinor: json['is_minor'] as bool? ?? false,
      );

  final int id;
  final String fullName;
  final String phone;
  final bool isMinor;
}

class Patient extends PatientSummary {
  const Patient({
    required super.id,
    required super.fullName,
    required super.phone,
    required super.isMinor,
    required this.address,
    required this.guardianName,
    required this.guardianPhone,
    required this.doctors,
  });

  factory Patient.fromJson(Json json) => Patient(
        id: json['id'] as int,
        fullName: json['full_name'] as String,
        phone: json['phone'] as String,
        isMinor: json['is_minor'] as bool,
        address: json['address'] as String? ?? '',
        guardianName: json['guardian_name'] as String? ?? '',
        guardianPhone: json['guardian_phone'] as String? ?? '',
        doctors: _list(json['doctors'], DoctorSummary.fromJson),
      );

  final String address;
  final String guardianName;
  final String guardianPhone;
  final List<DoctorSummary> doctors;
}

class PatientInput {
  const PatientInput({
    required this.fullName,
    required this.phone,
    this.address = '',
    this.isMinor = false,
    this.guardianName = '',
    this.guardianPhone = '',
    this.doctorIds,
  });

  final String fullName;
  final String phone;
  final String address;
  final bool isMinor;
  final String guardianName;
  final String guardianPhone;
  final List<int>? doctorIds;

  Json toJson() => {
        'full_name': fullName,
        'phone': phone,
        'address': address,
        'is_minor': isMinor,
        'guardian_name': guardianName,
        'guardian_phone': guardianPhone,
        if (doctorIds != null) 'doctor_ids': doctorIds,
      };
}

enum AppointmentStatus {
  scheduled('SCHEDULED'),
  checkedIn('CHECKED_IN'),
  inVisit('IN_VISIT'),
  completed('COMPLETED'),
  cancelled('CANCELLED');

  const AppointmentStatus(this.apiValue);

  final String apiValue;

  static AppointmentStatus fromApi(String value) =>
      AppointmentStatus.values.firstWhere((s) => s.apiValue == value);

  bool get isOpen => this == scheduled || this == checkedIn;
}

enum PaymentStatus {
  notSet('NOT_SET'),
  pending('PENDING'),
  paid('PAID');

  const PaymentStatus(this.apiValue);

  final String apiValue;

  static PaymentStatus fromApi(String value) =>
      PaymentStatus.values.firstWhere((s) => s.apiValue == value);
}

class Billing {
  const Billing({
    required this.amountDue,
    required this.amountPaid,
    required this.remainingAmount,
    required this.status,
    required this.statusDisplay,
  });

  factory Billing.fromJson(Json json) => Billing(
        amountDue: json['amount_due'] as String?,
        amountPaid: json['amount_paid'] as String,
        remainingAmount: json['remaining_amount'] as String?,
        status: PaymentStatus.fromApi(json['payment_status'] as String),
        statusDisplay: json['payment_status_display'] as String,
      );

  /// Decimal strings, e.g. `"350.00"`; `null` until the amount due is set.
  final String? amountDue;
  final String amountPaid;
  final String? remainingAmount;
  final PaymentStatus status;
  final String statusDisplay;

  double get remaining => double.tryParse(remainingAmount ?? '') ?? 0;
}

class Appointment {
  const Appointment({
    required this.id,
    required this.patient,
    required this.doctor,
    required this.scheduledAt,
    required this.status,
    required this.statusDisplay,
    required this.notes,
    required this.followUpOf,
    required this.visitId,
    required this.billing,
    required this.checkedInAt,
  });

  factory Appointment.fromJson(Json json) => Appointment(
        id: json['id'] as int,
        patient: PatientSummary.fromJson(json['patient'] as Json),
        doctor: DoctorSummary.fromJson(json['doctor'] as Json),
        scheduledAt: _date(json['scheduled_at'])!,
        status: AppointmentStatus.fromApi(json['status'] as String),
        statusDisplay: json['status_display'] as String,
        notes: json['notes'] as String? ?? '',
        followUpOf: json['follow_up_of'] as int?,
        visitId: json['visit_id'] as int?,
        billing: json['billing'] == null
            ? null
            : Billing.fromJson(json['billing'] as Json),
        checkedInAt: _date(json['checked_in_at']),
      );

  final int id;
  final PatientSummary patient;
  final DoctorSummary doctor;
  final DateTime scheduledAt;
  final AppointmentStatus status;
  final String statusDisplay;
  final String notes;
  final int? followUpOf;
  final int? visitId;

  /// Only present for users with `payments.view_payment`.
  final Billing? billing;
  final DateTime? checkedInAt;
}

class ClinicQueue {
  const ClinicQueue({required this.waiting, required this.inVisit});

  factory ClinicQueue.fromJson(Json json) => ClinicQueue(
        waiting: _list(json['waiting'], Appointment.fromJson),
        inVisit: _list(json['in_visit'], Appointment.fromJson),
      );

  final List<Appointment> waiting;
  final List<Appointment> inVisit;
}

class CatalogProcedure {
  const CatalogProcedure({required this.id, required this.name, required this.code});

  factory CatalogProcedure.fromJson(Json json) => CatalogProcedure(
        id: json['id'] as int,
        name: json['name'] as String,
        code: json['code'] as String? ?? '',
      );

  final int id;
  final String name;
  final String code;
}

class CatalogMedication {
  const CatalogMedication({required this.id, required this.name, required this.details});

  factory CatalogMedication.fromJson(Json json) => CatalogMedication(
        id: json['id'] as int,
        name: json['name'] as String,
        details: json['details'] as String? ?? '',
      );

  final int id;
  final String name;
  final String details;
}

class VisitProcedure {
  const VisitProcedure({
    required this.id,
    required this.procedure,
    required this.tooth,
    required this.notes,
  });

  factory VisitProcedure.fromJson(Json json) => VisitProcedure(
        id: json['id'] as int,
        procedure: json['procedure'] == null
            ? null
            : CatalogProcedure.fromJson(json['procedure'] as Json),
        tooth: json['tooth'] as String? ?? '',
        notes: json['notes'] as String? ?? '',
      );

  final int id;
  final CatalogProcedure? procedure;
  final String tooth;
  final String notes;
}

class VisitMedication {
  const VisitMedication({
    required this.id,
    required this.medication,
    required this.quantity,
    required this.duration,
  });

  factory VisitMedication.fromJson(Json json) => VisitMedication(
        id: json['id'] as int,
        medication: CatalogMedication.fromJson(json['medication'] as Json),
        quantity: json['quantity'] as String,
        duration: json['duration'] as String,
      );

  final int id;
  final CatalogMedication medication;
  final String quantity;
  final String duration;
}

class FollowUp {
  const FollowUp({
    required this.id,
    required this.scheduledAt,
    required this.notes,
    required this.status,
    required this.statusDisplay,
  });

  factory FollowUp.fromJson(Json json) => FollowUp(
        id: json['id'] as int,
        scheduledAt: _date(json['scheduled_at'])!,
        notes: json['notes'] as String? ?? '',
        status: AppointmentStatus.fromApi(json['status'] as String),
        statusDisplay: json['status_display'] as String,
      );

  final int id;
  final DateTime scheduledAt;
  final String notes;
  final AppointmentStatus status;
  final String statusDisplay;
}

class Visit {
  const Visit({
    required this.id,
    required this.isActive,
    required this.statusDisplay,
    required this.patient,
    required this.doctor,
    required this.appointmentId,
    required this.startedAt,
    required this.completedAt,
    required this.notes,
    required this.diagnosis,
    required this.treatment,
    required this.procedures,
    required this.medications,
    required this.followUps,
    required this.canEdit,
  });

  factory Visit.fromJson(Json json) => Visit(
        id: json['id'] as int,
        isActive: json['status'] == 'ACTIVE',
        statusDisplay: json['status_display'] as String,
        patient: PatientSummary.fromJson(json['patient'] as Json),
        doctor: DoctorSummary.fromJson(json['doctor'] as Json),
        appointmentId: json['appointment'] as int,
        startedAt: _date(json['started_at'])!,
        completedAt: _date(json['completed_at']),
        notes: json['notes'] as String? ?? '',
        diagnosis: json['diagnosis'] as String? ?? '',
        treatment: json['treatment'] as String? ?? '',
        procedures: _list(json['procedures'], VisitProcedure.fromJson),
        medications: _list(json['medications'], VisitMedication.fromJson),
        followUps: _list(json['follow_ups'], FollowUp.fromJson),
        canEdit: json['can_edit'] as bool? ?? false,
      );

  final int id;
  final bool isActive;
  final String statusDisplay;
  final PatientSummary patient;
  final DoctorSummary doctor;
  final int appointmentId;
  final DateTime startedAt;
  final DateTime? completedAt;
  final String notes;
  final String diagnosis;
  final String treatment;
  final List<VisitProcedure> procedures;
  final List<VisitMedication> medications;
  final List<FollowUp> followUps;

  /// True only for the owning doctor while the visit is active.
  final bool canEdit;
}

class PaymentMethod {
  const PaymentMethod({required this.id, required this.name, required this.code});

  factory PaymentMethod.fromJson(Json json) => PaymentMethod(
        id: json['id'] as int,
        name: json['name'] as String,
        code: json['code'] as String,
      );

  final int id;
  final String name;
  final String code;
}

class Payment {
  const Payment({
    required this.id,
    required this.amount,
    required this.method,
    required this.note,
    required this.receivedBy,
    required this.receivedAt,
  });

  factory Payment.fromJson(Json json) => Payment(
        id: json['id'] as int,
        amount: json['amount'] as String,
        method: PaymentMethod.fromJson(json['method'] as Json),
        note: json['note'] as String? ?? '',
        receivedBy: json['received_by'] as String?,
        receivedAt: _date(json['received_at'])!,
      );

  final int id;
  final String amount;
  final PaymentMethod method;
  final String note;
  final String? receivedBy;
  final DateTime receivedAt;
}

class Balance {
  const Balance({
    required this.amountDue,
    required this.amountPaid,
    required this.remainingAmount,
  });

  factory Balance.fromJson(Json json) => Balance(
        amountDue: json['amount_due'] as String,
        amountPaid: json['amount_paid'] as String,
        remainingAmount: json['remaining_amount'] as String,
      );

  final String amountDue;
  final String amountPaid;
  final String remainingAmount;
}

class PageResult<T> {
  const PageResult({required this.count, required this.results, required this.hasNext});

  factory PageResult.fromJson(Json json, T Function(Json json) parse) => PageResult(
        count: json['count'] as int,
        results: _list(json['results'], parse),
        hasNext: json['next'] != null,
      );

  final int count;
  final List<T> results;
  final bool hasNext;
}
