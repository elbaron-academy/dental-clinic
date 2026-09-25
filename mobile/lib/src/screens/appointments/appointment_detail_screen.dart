import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/dental_api.dart';
import '../../auth/auth_controller.dart';
import '../../models/models.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';
import '../../widgets/date_time_field.dart';
import '../visits/visit_screen.dart';

class _AppointmentData {
  const _AppointmentData(this.appointment, this.payments);

  final Appointment appointment;
  final List<Payment>? payments;
}

/// Appointment status actions and billing (APPT-002..005, PAY-001..004).
class AppointmentDetailScreen extends StatelessWidget {
  const AppointmentDetailScreen({super.key, required this.appointmentId});

  final int appointmentId;

  Future<_AppointmentData> _load(BuildContext context) async {
    final api = context.read<DentalApi>();
    final canSeePayments = context.read<AuthController>().hasPerm('payments.view_payment');
    final appointment = await api.appointment(appointmentId);
    final payments = canSeePayments ? await api.payments(appointmentId: appointmentId) : null;
    return _AppointmentData(appointment, payments);
  }

  @override
  Widget build(BuildContext context) {
    return AsyncView<_AppointmentData>(
      title: 'Appointment',
      load: () => _load(context),
      builder: (context, data, reload) => _AppointmentView(data: data, reload: reload),
    );
  }
}

class _AppointmentView extends StatelessWidget {
  const _AppointmentView({required this.data, required this.reload});

  final _AppointmentData data;
  final Future<void> Function() reload;

  Future<void> _act(BuildContext context, Future<Appointment> Function() action, {bool openVisit = false}) async {
    final auth = context.read<AuthController>();
    try {
      final updated = await action();
      if (!context.mounted) return;
      if (openVisit &&
          updated.visitId != null &&
          auth.hasPerm('visits.view_visit') &&
          updated.doctor.id == auth.user?.id) {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => VisitScreen(visitId: updated.visitId!)),
        );
      }
    } on ApiException catch (error) {
      if (context.mounted) showError(context, error);
    }
    await reload();
  }

  Future<void> _reschedule(BuildContext context, Appointment a) async {
    final api = context.read<DentalApi>();
    var when = a.scheduledAt;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Reschedule'),
          content: DateTimeField(
            label: 'Date and time',
            value: when,
            onChanged: (value) => setState(() => when = value),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Save')),
          ],
        ),
      ),
    );
    if (confirmed == true && context.mounted) {
      await _act(context, () => api.updateAppointment(a.id, scheduledAt: when));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final api = context.read<DentalApi>();
    final a = data.appointment;

    return Scaffold(
      appBar: AppBar(title: Text(a.patient.fullName)),
      body: RefreshIndicator(
        onRefresh: reload,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 32),
          children: [
            SectionCard(
              title: 'Appointment',
              trailing: StatusChip.appointment(a.status, a.statusDisplay),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Patient: ${a.patient.fullName} · ${a.patient.phone}'),
                  Text('Doctor: ${a.doctor.fullName}'),
                  Text('Scheduled: ${formatDateTime(a.scheduledAt)}'),
                  if (a.checkedInAt != null) Text('Checked in: ${formatDateTime(a.checkedInAt)}'),
                  if (a.notes.isNotEmpty) Text('Notes: ${a.notes}'),
                  if (a.followUpOf != null) Text('Follow-up of visit #${a.followUpOf}'),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (a.status == AppointmentStatus.scheduled && auth.hasPerm('appointments.check_in_appointment'))
                        FilledButton.tonal(
                          onPressed: () => _act(context, () => api.checkIn(a.id)),
                          child: const Text('Check in'),
                        ),
                      if (a.status == AppointmentStatus.checkedIn && auth.hasPerm('visits.start_visit'))
                        FilledButton(
                          onPressed: () => _act(context, () => api.startVisit(a.id), openVisit: true),
                          child: const Text('Start visit'),
                        ),
                      if (a.visitId != null && auth.hasPerm('visits.view_visit'))
                        OutlinedButton(
                          onPressed: () async {
                            await Navigator.of(context).push(
                              MaterialPageRoute<void>(builder: (_) => VisitScreen(visitId: a.visitId!)),
                            );
                            await reload();
                          },
                          child: const Text('Open visit'),
                        ),
                      if (a.status.isOpen && auth.hasPerm('appointments.change_appointment'))
                        OutlinedButton(
                          onPressed: () => _reschedule(context, a),
                          child: const Text('Reschedule'),
                        ),
                      if (a.status.isOpen && auth.hasPerm('appointments.cancel_appointment'))
                        TextButton(
                          onPressed: () async {
                            if (await confirm(context, 'Cancel appointment', 'Cancel this appointment?') &&
                                context.mounted) {
                              await _act(context, () => api.cancel(a.id));
                            }
                          },
                          child: const Text('Cancel appointment'),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            if (a.billing != null)
              _BillingCard(appointment: a, payments: data.payments ?? const [], reload: reload),
          ],
        ),
      ),
    );
  }
}

/// Amount due, paid and remaining; payments before or after the visit.
class _BillingCard extends StatelessWidget {
  const _BillingCard({required this.appointment, required this.payments, required this.reload});

  final Appointment appointment;
  final List<Payment> payments;
  final Future<void> Function() reload;

  Future<void> _setAmountDue(BuildContext context) async {
    final api = context.read<DentalApi>();
    final value = await _askAmount(context, 'Amount due', appointment.billing!.amountDue ?? '');
    if (value == null || !context.mounted) return;
    try {
      await api.setAmountDue(appointment.id, value);
    } on ApiException catch (error) {
      if (context.mounted) showError(context, error.field('amount_due') ?? error);
    }
    await reload();
  }

  Future<void> _recordPayment(BuildContext context) async {
    final api = context.read<DentalApi>();
    final List<PaymentMethod> methods;
    try {
      methods = await api.paymentMethods();
    } on ApiException catch (error) {
      if (context.mounted) showError(context, error);
      return;
    }
    if (methods.isEmpty || !context.mounted) return;
    final amount = TextEditingController(text: appointment.billing!.remainingAmount ?? '');
    var methodId = methods.first.id;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Record payment'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: amount,
                autofocus: true,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Amount'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<int>(
                value: methodId,
                decoration: const InputDecoration(labelText: 'Method'),
                items: [
                  for (final method in methods) DropdownMenuItem(value: method.id, child: Text(method.name)),
                ],
                onChanged: (value) => setState(() => methodId = value ?? methodId),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Record')),
          ],
        ),
      ),
    );
    final value = amount.text.trim();
    amount.dispose();
    if (confirmed != true || !context.mounted) return;
    try {
      await api.recordPayment(appointmentId: appointment.id, amount: value, methodId: methodId);
    } on ApiException catch (error) {
      if (context.mounted) showError(context, error.field('amount') ?? error);
    }
    await reload();
  }

  Future<String?> _askAmount(BuildContext context, String label, String initial) {
    final controller = TextEditingController(text: initial);
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(label),
        content: TextField(
          controller: controller,
          autofocus: true,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    ).whenComplete(controller.dispose);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final billing = appointment.billing!;
    final cancelled = appointment.status == AppointmentStatus.cancelled;
    final canPay = auth.hasPerm('payments.add_payment') &&
        !cancelled &&
        billing.remainingAmount != null &&
        billing.remaining > 0;

    return SectionCard(
      title: 'Payment',
      trailing: StatusChip.payment(billing),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Amount due: ${billing.amountDue == null ? 'Not set' : formatMoney(billing.amountDue)}'),
          Text('Paid: ${formatMoney(billing.amountPaid)}'),
          Text(
            'Remaining: ${formatMoney(billing.remainingAmount)}',
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              if (auth.hasPerm('payments.manage_billing') && !cancelled)
                OutlinedButton(
                  onPressed: () => _setAmountDue(context),
                  child: Text(billing.amountDue == null ? 'Set amount due' : 'Update amount due'),
                ),
              if (canPay)
                FilledButton(onPressed: () => _recordPayment(context), child: const Text('Record payment')),
            ],
          ),
          const SizedBox(height: 8),
          if (payments.isEmpty)
            const EmptyText('No payments recorded.')
          else
            for (final payment in payments)
              Text(
                '${formatMoney(payment.amount)} · ${payment.method.name} · ${formatDateTime(payment.receivedAt)}'
                '${payment.receivedBy == null ? '' : ' · ${payment.receivedBy}'}',
              ),
        ],
      ),
    );
  }
}
