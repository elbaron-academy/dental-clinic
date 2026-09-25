import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api/dental_api.dart';
import '../auth/auth_controller.dart';
import '../models/models.dart';
import '../screens/appointments/appointment_detail_screen.dart';
import '../screens/visits/visit_screen.dart';
import '../utils/format.dart';
import 'common.dart';

/// One appointment with the queue actions the user is allowed to take
/// (APPT-002 check-in, APPT-004 start visit).
class AppointmentTile extends StatefulWidget {
  const AppointmentTile({
    super.key,
    required this.appointment,
    required this.onChanged,
    this.showDate = false,
    this.useCheckInTime = false,
  });

  final Appointment appointment;
  final VoidCallback onChanged;
  final bool showDate;
  final bool useCheckInTime;

  @override
  State<AppointmentTile> createState() => _AppointmentTileState();
}

class _AppointmentTileState extends State<AppointmentTile> {
  bool _pending = false;

  Future<void> _run(Future<Appointment> Function() action, {bool openVisit = false}) async {
    final auth = context.read<AuthController>();
    setState(() => _pending = true);
    try {
      final updated = await action();
      if (!mounted) return;
      if (openVisit &&
          updated.visitId != null &&
          auth.hasPerm('visits.view_visit') &&
          updated.doctor.id == auth.user?.id) {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => VisitScreen(visitId: updated.visitId!)),
        );
      }
      widget.onChanged();
    } on Exception catch (error) {
      if (mounted) showError(context, error);
      widget.onChanged();
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final api = context.read<DentalApi>();
    final a = widget.appointment;
    final time = widget.useCheckInTime ? a.checkedInAt : a.scheduledAt;
    final showDoctor = (auth.user?.permittedDoctors.length ?? 0) > 1;

    final actions = <Widget>[
      if (a.status == AppointmentStatus.scheduled && auth.hasPerm('appointments.check_in_appointment'))
        FilledButton.tonal(
          onPressed: _pending ? null : () => _run(() => api.checkIn(a.id)),
          child: const Text('Check in'),
        ),
      if (a.status == AppointmentStatus.checkedIn && auth.hasPerm('visits.start_visit'))
        FilledButton(
          onPressed: _pending ? null : () => _run(() => api.startVisit(a.id), openVisit: true),
          child: const Text('Start visit'),
        ),
      if (a.visitId != null && auth.hasPerm('visits.view_visit'))
        OutlinedButton(
          onPressed: () async {
            await Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => VisitScreen(visitId: a.visitId!)),
            );
            widget.onChanged();
          },
          child: Text(
            a.status == AppointmentStatus.inVisit && a.doctor.id == auth.user?.id ? 'Open visit' : 'View visit',
          ),
        ),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: InkWell(
        onTap: () async {
          await Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => AppointmentDetailScreen(appointmentId: a.id)),
          );
          widget.onChanged();
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                SizedBox(
                  width: widget.showDate ? 120 : 56,
                  child: Text(
                    widget.showDate ? formatDateTime(time) : formatTime(time),
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(a.patient.fullName, style: const TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          if (showDoctor) Text(a.doctor.fullName, style: const TextStyle(fontSize: 12)),
                          StatusChip.appointment(a.status, a.statusDisplay),
                          if (a.billing != null) StatusChip.payment(a.billing!),
                          if (a.followUpOf != null) const StatusChip(label: 'Follow-up', color: Colors.grey),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (actions.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Wrap(spacing: 8, runSpacing: 4, children: actions),
              ),
          ],
        ),
      ),
    );
  }
}
