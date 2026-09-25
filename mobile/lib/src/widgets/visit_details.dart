import 'package:flutter/material.dart';

import '../models/models.dart';
import '../utils/format.dart';
import 'common.dart';

/// Read-only clinical record of a visit (history and completed visits).
class VisitDetails extends StatelessWidget {
  const VisitDetails({super.key, required this.visit});

  final Visit visit;

  @override
  Widget build(BuildContext context) {
    final sections = <Widget>[
      if (visit.notes.isNotEmpty) _section(context, 'Notes', Text(visit.notes)),
      if (visit.diagnosis.isNotEmpty) _section(context, 'Diagnosis', Text(visit.diagnosis)),
      if (visit.treatment.isNotEmpty) _section(context, 'Treatment', Text(visit.treatment)),
      if (visit.procedures.isNotEmpty)
        _section(
          context,
          'Procedures',
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final entry in visit.procedures)
                Text([
                  entry.procedure?.name ?? 'Other',
                  if (entry.tooth.isNotEmpty) 'tooth ${entry.tooth}',
                  if (entry.notes.isNotEmpty) entry.notes,
                ].join(' · ')),
            ],
          ),
        ),
      if (visit.medications.isNotEmpty)
        _section(
          context,
          'Medications',
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final entry in visit.medications)
                Text('${entry.medication.name} — ${entry.quantity}, ${entry.duration}'),
            ],
          ),
        ),
      if (visit.followUps.isNotEmpty)
        _section(
          context,
          'Follow-ups',
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final follow in visit.followUps)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Wrap(
                    spacing: 6,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(formatDateTime(follow.scheduledAt)),
                      StatusChip.appointment(follow.status, follow.statusDisplay),
                    ],
                  ),
                ),
            ],
          ),
        ),
    ];
    if (sections.isEmpty) return const EmptyText('Nothing recorded yet.');
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: sections);
  }

  Widget _section(BuildContext context, String title, Widget child) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title.toUpperCase(), style: Theme.of(context).textTheme.labelSmall),
          const SizedBox(height: 2),
          child,
        ],
      ),
    );
  }
}
