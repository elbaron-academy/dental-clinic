import '../models/models.dart';
import 'api_client.dart';

/// Typed endpoints of the approved API contract (docs/API.md).
class DentalApi {
  DentalApi(this.client);

  final ApiClient client;

  // Authentication (Sprint 02)
  Future<({String token, Me user})> login(String phone, String password, Role role) async {
    final data = await client.post('/auth/login/', {
      'phone': phone,
      'password': password,
      'role': role.apiValue,
    }) as Json;
    return (token: data['token'] as String, user: Me.fromJson(data['user'] as Json));
  }

  Future<void> logout() => client.post('/auth/logout/');

  Future<Me> me() async => Me.fromJson(await client.get('/auth/me/') as Json);

  // Patients (Sprint 03)
  Future<PageResult<Patient>> patients({String? search, int? doctor, int page = 1}) async =>
      PageResult.fromJson(
        await client.get('/patients/', query: {'search': search, 'doctor': doctor, 'page': page}) as Json,
        Patient.fromJson,
      );

  Future<Patient> patient(int id) async => Patient.fromJson(await client.get('/patients/$id/') as Json);

  Future<Patient> createPatient(PatientInput input) async =>
      Patient.fromJson(await client.post('/patients/', input.toJson()) as Json);

  Future<Patient> updatePatient(int id, PatientInput input) async {
    final body = input.toJson()..remove('doctor_ids');
    return Patient.fromJson(await client.patch('/patients/$id/', body) as Json);
  }

  Future<Balance> patientBalance(int id) async =>
      Balance.fromJson(await client.get('/patients/$id/balance/') as Json);

  // Appointments (Sprint 04)
  Future<PageResult<Appointment>> appointments({
    DateTime? from,
    DateTime? to,
    int? doctor,
    int? patient,
    List<AppointmentStatus>? statuses,
    String? ordering,
  }) async =>
      PageResult.fromJson(
        await client.get('/appointments/', query: {
          'scheduled_from': from?.toUtc().toIso8601String(),
          'scheduled_to': to?.toUtc().toIso8601String(),
          'doctor': doctor,
          'patient': patient,
          'status': statuses?.map((s) => s.apiValue).join(','),
          'ordering': ordering,
          'page_size': 200,
        }) as Json,
        Appointment.fromJson,
      );

  Future<Appointment> appointment(int id) async =>
      Appointment.fromJson(await client.get('/appointments/$id/') as Json);

  Future<Appointment> createAppointment({
    required int patientId,
    int? doctorId,
    required DateTime scheduledAt,
    String notes = '',
  }) async =>
      Appointment.fromJson(await client.post('/appointments/', {
        'patient_id': patientId,
        if (doctorId != null) 'doctor_id': doctorId,
        'scheduled_at': scheduledAt.toUtc().toIso8601String(),
        'notes': notes,
      }) as Json);

  Future<Appointment> updateAppointment(
    int id, {
    DateTime? scheduledAt,
    int? doctorId,
    String? notes,
  }) async =>
      Appointment.fromJson(await client.patch('/appointments/$id/', {
        if (scheduledAt != null) 'scheduled_at': scheduledAt.toUtc().toIso8601String(),
        if (doctorId != null) 'doctor_id': doctorId,
        if (notes != null) 'notes': notes,
      }) as Json);

  Future<Appointment> checkIn(int id) async =>
      Appointment.fromJson(await client.post('/appointments/$id/check-in/') as Json);

  Future<Appointment> cancel(int id) async =>
      Appointment.fromJson(await client.post('/appointments/$id/cancel/') as Json);

  /// Fails with `409 active_visit_exists` if the patient is already in a visit.
  Future<Appointment> startVisit(int id) async =>
      Appointment.fromJson(await client.post('/appointments/$id/start-visit/') as Json);

  Future<ClinicQueue> queue({int? doctor}) async =>
      ClinicQueue.fromJson(await client.get('/appointments/queue/', query: {'doctor': doctor}) as Json);

  // Visits and catalog (Sprint 05)
  Future<PageResult<Visit>> visits({int? patient}) async => PageResult.fromJson(
        await client.get('/visits/', query: {'patient': patient}) as Json,
        Visit.fromJson,
      );

  Future<Visit> visit(int id) async => Visit.fromJson(await client.get('/visits/$id/') as Json);

  Future<Visit> updateVisit(int id, {required String notes, required String diagnosis, required String treatment}) async =>
      Visit.fromJson(await client.patch('/visits/$id/', {
        'notes': notes,
        'diagnosis': diagnosis,
        'treatment': treatment,
      }) as Json);

  Future<Visit> addProcedure(int id, {int? procedureId, String tooth = '', String notes = ''}) async =>
      Visit.fromJson(await client.post('/visits/$id/procedures/', {
        'procedure_id': procedureId,
        'tooth': tooth,
        'notes': notes,
      }) as Json);

  Future<Visit> removeProcedure(int id, int entryId) async =>
      Visit.fromJson(await client.delete('/visits/$id/procedures/$entryId/') as Json);

  Future<Visit> addMedication(int id, {required int medicationId, required String quantity, required String duration}) async =>
      Visit.fromJson(await client.post('/visits/$id/medications/', {
        'medication_id': medicationId,
        'quantity': quantity,
        'duration': duration,
      }) as Json);

  Future<Visit> removeMedication(int id, int entryId) async =>
      Visit.fromJson(await client.delete('/visits/$id/medications/$entryId/') as Json);

  Future<Visit> addFollowUp(int id, {required DateTime scheduledAt, String notes = ''}) async =>
      Visit.fromJson(await client.post('/visits/$id/follow-ups/', {
        'scheduled_at': scheduledAt.toUtc().toIso8601String(),
        'notes': notes,
      }) as Json);

  Future<Visit> completeVisit(int id) async =>
      Visit.fromJson(await client.post('/visits/$id/complete/') as Json);

  Future<List<CatalogProcedure>> procedures() async =>
      (await client.get('/catalog/procedures/') as List<dynamic>)
          .map((item) => CatalogProcedure.fromJson(item as Json))
          .toList();

  Future<List<CatalogMedication>> medications() async =>
      (await client.get('/catalog/medications/') as List<dynamic>)
          .map((item) => CatalogMedication.fromJson(item as Json))
          .toList();

  // Payments (Sprint 06)
  Future<Appointment> setAmountDue(int appointmentId, String amountDue) async =>
      Appointment.fromJson(await client.post('/appointments/$appointmentId/amount-due/', {
        'amount_due': amountDue,
      }) as Json);

  Future<List<Payment>> payments({required int appointmentId}) async {
    final page = await client.get('/payments/', query: {'appointment': appointmentId, 'page_size': 200}) as Json;
    return (page['results'] as List<dynamic>).map((item) => Payment.fromJson(item as Json)).toList();
  }

  Future<Payment> recordPayment({
    required int appointmentId,
    required String amount,
    required int methodId,
    String note = '',
  }) async =>
      Payment.fromJson(await client.post('/payments/', {
        'appointment_id': appointmentId,
        'amount': amount,
        'method_id': methodId,
        'note': note,
      }) as Json);

  Future<List<PaymentMethod>> paymentMethods() async =>
      (await client.get('/payment-methods/') as List<dynamic>)
          .map((item) => PaymentMethod.fromJson(item as Json))
          .toList();
}
