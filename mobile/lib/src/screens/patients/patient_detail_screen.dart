import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/dental_api.dart';
import '../../auth/auth_controller.dart';
import '../../models/models.dart';
import '../../utils/format.dart';
import '../../widgets/appointment_tile.dart';
import '../../widgets/common.dart';
import '../../widgets/visit_details.dart';
import '../appointments/appointment_form_screen.dart';
import '../visits/visit_screen.dart';
import 'patient_form_screen.dart';

class _PatientData {
  const _PatientData(this.patient, this.appointments, this.visits, this.balance);

  final Patient patient;
  final List<Appointment> appointments;
  final List<Visit>? visits;
  final Balance? balance;
}

/// Patient record, balance, appointments and visit history (VISIT-008, LIFE-002/003).
class PatientDetailScreen extends StatelessWidget {
  const PatientDetailScreen({super.key, required this.patientId});

  final int patientId;

  Future<_PatientData> _load(BuildContext context) async {
    final api = context.read<DentalApi>();
    final auth = context.read<AuthController>();
    final patient = await api.patient(patientId);
    final appointments = await api.appointments(patient: patientId, ordering: '-scheduled_at');
    final visits = auth.hasPerm('visits.view_visit') ? (await api.visits(patient: patientId)).results : null;
    final balance = auth.hasPerm('payments.view_payment') ? await api.patientBalance(patientId) : null;
    return _PatientData(patient, appointments.results, visits, balance);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    return AsyncView<_PatientData>(
      title: 'Patient',
      load: () => _load(context),
      builder: (context, data, reload) {
        final p = data.patient;
        Future<void> open(Widget screen) async {
          await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));
          await reload();
        }

        return Scaffold(
          appBar: AppBar(
            title: Text(p.fullName),
            actions: [
              if (auth.hasPerm('patients.change_patient'))
                IconButton(
                  tooltip: 'Edit',
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: () => open(PatientFormScreen(patient: p)),
                ),
            ],
          ),
          floatingActionButton: auth.hasPerm('appointments.add_appointment')
              ? FloatingActionButton.extended(
                  onPressed: () => open(AppointmentFormScreen(patient: p)),
                  icon: const Icon(Icons.event_available),
                  label: const Text('New appointment'),
                )
              : null,
          body: RefreshIndicator(
            onRefresh: reload,
            child: ListView(
              padding: const EdgeInsets.only(bottom: 96),
              children: [
                SectionCard(
                  title: 'Details',
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Phone: ${p.phone}'),
                      Text('Address: ${p.address.isEmpty ? 'Not provided' : p.address}'),
                      if (p.isMinor) Text('Guardian: ${p.guardianName} · ${p.guardianPhone}'),
                      Text('Doctors: ${p.doctors.map((d) => d.fullName).join(', ')}'),
                    ],
                  ),
                ),
                if (data.balance != null)
                  SectionCard(
                    title: 'Balance',
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Amount due: ${formatMoney(data.balance!.amountDue)}'),
                        Text('Paid: ${formatMoney(data.balance!.amountPaid)}'),
                        Text(
                          'Remaining: ${formatMoney(data.balance!.remainingAmount)}',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                SectionCard(
                  title: 'Appointments',
                  child: data.appointments.isEmpty
                      ? const EmptyText('No appointments yet.')
                      : Column(
                          children: [
                            for (final a in data.appointments)
                              AppointmentTile(appointment: a, onChanged: reload, showDate: true),
                          ],
                        ),
                ),
                if (data.visits != null)
                  SectionCard(
                    title: 'Visit history',
                    child: data.visits!.isEmpty
                        ? const EmptyText('No previous visits. This patient has no history yet.')
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              for (final visit in data.visits!)
                                ListTile(
                                  contentPadding: EdgeInsets.zero,
                                  title: Text('${formatDateTime(visit.startedAt)} · ${visit.doctor.fullName}'),
                                  subtitle: Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: VisitDetails(visit: visit),
                                  ),
                                  trailing: Text(visit.statusDisplay),
                                  onTap: () => open(VisitScreen(visitId: visit.id)),
                                ),
                            ],
                          ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}
