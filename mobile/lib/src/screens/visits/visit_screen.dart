import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/dental_api.dart';
import '../../models/models.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';
import '../../widgets/date_time_field.dart';
import '../../widgets/visit_details.dart';

/// The doctor's visit screen: record the session and complete it
/// (VISIT-001..007). Other users see the record read-only.
class VisitScreen extends StatefulWidget {
  const VisitScreen({super.key, required this.visitId});

  final int visitId;

  @override
  State<VisitScreen> createState() => _VisitScreenState();
}

class _VisitScreenState extends State<VisitScreen> {
  Visit? _visit;
  Object? _error;
  List<CatalogProcedure> _procedures = const [];
  List<CatalogMedication> _medications = const [];
  final _notes = TextEditingController();
  final _diagnosis = TextEditingController();
  final _treatment = TextEditingController();
  bool _pending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _notes.dispose();
    _diagnosis.dispose();
    _treatment.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final api = context.read<DentalApi>();
    try {
      final visit = await api.visit(widget.visitId);
      if (visit.canEdit) {
        final catalogs = await Future.wait([api.procedures(), api.medications()]);
        _procedures = catalogs[0] as List<CatalogProcedure>;
        _medications = catalogs[1] as List<CatalogMedication>;
      }
      if (!mounted) return;
      _notes.text = visit.notes;
      _diagnosis.text = visit.diagnosis;
      _treatment.text = visit.treatment;
      setState(() {
        _visit = visit;
        _error = null;
      });
    } on Exception catch (error) {
      if (mounted) setState(() => _error = error);
    }
  }

  bool get _dirty {
    final visit = _visit;
    if (visit == null) return false;
    return _notes.text != visit.notes || _diagnosis.text != visit.diagnosis || _treatment.text != visit.treatment;
  }

  /// Runs an API call that returns the updated visit.
  Future<bool> _apply(Future<Visit> Function() action) async {
    setState(() => _pending = true);
    try {
      final visit = await action();
      if (mounted) setState(() => _visit = visit);
      return true;
    } on ApiException catch (error) {
      if (mounted) {
        final firstFieldError = error.fieldErrors.values.isEmpty ? null : error.fieldErrors.values.first.first;
        showError(context, firstFieldError ?? error);
      }
      return false;
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  Future<bool> _saveNotes() {
    final api = context.read<DentalApi>();
    return _apply(
      () => api.updateVisit(
        widget.visitId,
        notes: _notes.text,
        diagnosis: _diagnosis.text,
        treatment: _treatment.text,
      ),
    );
  }

  Future<void> _complete() async {
    final api = context.read<DentalApi>();
    final ok = await confirm(context, 'Complete visit', 'Complete this visit? It can no longer be changed afterwards.');
    if (!ok || !mounted) return;
    if (_dirty && !await _saveNotes()) return;
    if (await _apply(() => api.completeVisit(widget.visitId)) && mounted) {
      showMessage(context, 'Visit completed. It stays in the patient history.');
    }
  }

  Future<void> _addProcedure() async {
    final api = context.read<DentalApi>();
    int? procedureId;
    final tooth = TextEditingController();
    final notes = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Add procedure'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<int?>(
                  value: procedureId,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Procedure'),
                  items: [
                    const DropdownMenuItem<int?>(value: null, child: Text('Other (describe in notes)')),
                    for (final item in _procedures)
                      DropdownMenuItem<int?>(
                        value: item.id,
                        child: Text(item.code.isEmpty ? item.name : '${item.name} (${item.code})'),
                      ),
                  ],
                  onChanged: (value) => setState(() => procedureId = value),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: tooth,
                  keyboardType: TextInputType.number,
                  maxLength: 2,
                  decoration: const InputDecoration(labelText: 'Tooth (FDI, e.g. 36)'),
                ),
                TextField(controller: notes, decoration: const InputDecoration(labelText: 'Notes')),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Add')),
          ],
        ),
      ),
    );
    final toothValue = tooth.text.trim();
    final notesValue = notes.text.trim();
    tooth.dispose();
    notes.dispose();
    if (confirmed != true) return;
    await _apply(
      () => api.addProcedure(widget.visitId, procedureId: procedureId, tooth: toothValue, notes: notesValue),
    );
  }

  Future<void> _addMedication() async {
    final api = context.read<DentalApi>();
    if (_medications.isEmpty) {
      showMessage(context, 'No medications are configured. Ask an administrator.');
      return;
    }
    var medicationId = _medications.first.id;
    final quantity = TextEditingController();
    final duration = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Add medication'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<int>(
                  value: medicationId,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Medication *'),
                  items: [
                    for (final item in _medications)
                      DropdownMenuItem(
                        value: item.id,
                        child: Text(item.details.isEmpty ? item.name : '${item.name} — ${item.details}'),
                      ),
                  ],
                  onChanged: (value) => setState(() => medicationId = value ?? medicationId),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: quantity,
                  decoration: const InputDecoration(labelText: 'Quantity *', hintText: 'e.g. 21 capsules'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: duration,
                  decoration: const InputDecoration(labelText: 'Duration *', hintText: 'e.g. 7 days'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Add')),
          ],
        ),
      ),
    );
    final quantityValue = quantity.text.trim();
    final durationValue = duration.text.trim();
    quantity.dispose();
    duration.dispose();
    if (confirmed != true) return;
    await _apply(
      () => api.addMedication(
        widget.visitId,
        medicationId: medicationId,
        quantity: quantityValue,
        duration: durationValue,
      ),
    );
  }

  Future<void> _addFollowUp() async {
    final api = context.read<DentalApi>();
    final now = DateTime.now();
    var when = DateTime(now.year, now.month, now.day + 7, 10);
    final notes = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Book follow-up'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DateTimeField(
                label: 'Date and time',
                value: when,
                firstDate: DateTime.now(),
                onChanged: (value) => setState(() => when = value),
              ),
              const SizedBox(height: 12),
              TextField(controller: notes, decoration: const InputDecoration(labelText: 'Notes (optional)')),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Book')),
          ],
        ),
      ),
    );
    final notesValue = notes.text.trim();
    notes.dispose();
    if (confirmed != true) return;
    await _apply(() => api.addFollowUp(widget.visitId, scheduledAt: when, notes: notesValue));
  }

  @override
  Widget build(BuildContext context) {
    final visit = _visit;
    if (visit == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Visit')),
        body: Center(
          child: _error == null ? const CircularProgressIndicator() : ErrorView(error: _error!, onRetry: _load),
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(title: Text(visit.patient.fullName)),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 32),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Text(
                'Visit with ${visit.doctor.fullName} · started ${formatDateTime(visit.startedAt)}'
                '${visit.completedAt == null ? '' : ' · completed ${formatDateTime(visit.completedAt)}'}'
                ' · ${visit.statusDisplay}',
              ),
            ),
            if (visit.canEdit) ..._editor(visit) else _readOnly(visit),
          ],
        ),
      ),
    );
  }

  Widget _readOnly(Visit visit) {
    return SectionCard(
      title: 'Clinical record',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (visit.isActive)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text('This visit is being recorded by ${visit.doctor.fullName}. Only they can change it.'),
            )
          else
            const Padding(
              padding: EdgeInsets.only(bottom: 8),
              child: Text('This visit is completed and kept in the patient history.'),
            ),
          VisitDetails(visit: visit),
        ],
      ),
    );
  }

  List<Widget> _editor(Visit visit) {
    final api = context.read<DentalApi>();
    return [
      SectionCard(
        title: 'Session notes',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _notes,
              maxLines: 3,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(labelText: 'Visit notes'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _diagnosis,
              maxLines: 2,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(labelText: 'Diagnosis'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _treatment,
              maxLines: 2,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(labelText: 'Treatment'),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.tonal(
                onPressed: _pending || !_dirty ? null : _saveNotes,
                child: Text(_dirty ? 'Save notes' : 'Saved'),
              ),
            ),
          ],
        ),
      ),
      SectionCard(
        title: 'Tooth / procedures',
        trailing: IconButton(
          tooltip: 'Add procedure',
          icon: const Icon(Icons.add),
          onPressed: _pending ? null : _addProcedure,
        ),
        child: visit.procedures.isEmpty
            ? const EmptyText('No procedures recorded.')
            : Column(
                children: [
                  for (final entry in visit.procedures)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(entry.procedure?.name ?? 'Other'),
                      subtitle: Text([
                        if (entry.tooth.isNotEmpty) 'Tooth ${entry.tooth}',
                        if (entry.notes.isNotEmpty) entry.notes,
                      ].join(' · ')),
                      trailing: IconButton(
                        tooltip: 'Remove',
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => _apply(() => api.removeProcedure(visit.id, entry.id)),
                      ),
                    ),
                ],
              ),
      ),
      SectionCard(
        title: 'Medications',
        trailing: IconButton(
          tooltip: 'Add medication',
          icon: const Icon(Icons.add),
          onPressed: _pending ? null : _addMedication,
        ),
        child: visit.medications.isEmpty
            ? const EmptyText('No medications prescribed.')
            : Column(
                children: [
                  for (final entry in visit.medications)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(entry.medication.name),
                      subtitle: Text('${entry.quantity}, ${entry.duration}'),
                      trailing: IconButton(
                        tooltip: 'Remove',
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => _apply(() => api.removeMedication(visit.id, entry.id)),
                      ),
                    ),
                ],
              ),
      ),
      SectionCard(
        title: 'Follow-up visits',
        trailing: IconButton(
          tooltip: 'Book follow-up',
          icon: const Icon(Icons.add),
          onPressed: _pending ? null : _addFollowUp,
        ),
        child: visit.followUps.isEmpty
            ? const EmptyText('No follow-up booked.')
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final follow in visit.followUps)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Wrap(
                        spacing: 8,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(formatDateTime(follow.scheduledAt)),
                          StatusChip.appointment(follow.status, follow.statusDisplay),
                          if (follow.notes.isNotEmpty) Text(follow.notes),
                        ],
                      ),
                    ),
                ],
              ),
      ),
      Padding(
        padding: const EdgeInsets.all(16),
        child: FilledButton.icon(
          onPressed: _pending ? null : _complete,
          icon: const Icon(Icons.check_circle_outline),
          label: const Text('Complete visit'),
        ),
      ),
    ];
  }
}
