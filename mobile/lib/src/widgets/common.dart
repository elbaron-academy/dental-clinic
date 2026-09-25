import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../models/models.dart';

String errorText(Object error) {
  if (error is ApiException) return error.message;
  if (error is String) return error;
  return 'Something went wrong. Please try again.';
}

void showError(BuildContext context, Object error) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(errorText(error)),
      backgroundColor: Theme.of(context).colorScheme.error,
    ),
  );
}

void showMessage(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
}

Future<bool> confirm(BuildContext context, String title, String message) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Yes')),
      ],
    ),
  );
  return result ?? false;
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, this.onRetry});

  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.error_outline, color: Theme.of(context).colorScheme.error, size: 36),
          const SizedBox(height: 8),
          Text(errorText(error), textAlign: TextAlign.center),
          if (onRetry != null) ...[
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
          ],
        ],
      ),
    );
  }
}

class EmptyText extends StatelessWidget {
  const EmptyText(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Center(
        child: Text(text, style: TextStyle(color: Theme.of(context).hintColor)),
      ),
    );
  }
}

class SectionCard extends StatelessWidget {
  const SectionCard({super.key, required this.title, required this.child, this.trailing});

  final String title;
  final Widget child;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.fromLTRB(12, 6, 12, 6),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(child: Text(title, style: Theme.of(context).textTheme.titleMedium)),
                if (trailing != null) trailing!,
              ],
            ),
            const SizedBox(height: 8),
            child,
          ],
        ),
      ),
    );
  }
}

/// Loads data with [load] and rebuilds with the result; pull-to-refresh friendly.
class AsyncView<T> extends StatefulWidget {
  const AsyncView({super.key, required this.load, required this.builder, this.title});

  final Future<T> Function() load;
  final Widget Function(BuildContext context, T data, Future<void> Function() reload) builder;

  /// When set, loading and error states are shown in a full screen with this title.
  final String? title;

  @override
  State<AsyncView<T>> createState() => _AsyncViewState<T>();
}

class _AsyncViewState<T> extends State<AsyncView<T>> {
  late Future<T> _future = widget.load();

  Future<void> _reload() async {
    final future = widget.load();
    setState(() => _future = future);
    try {
      await future;
    } on Exception {
      // Rendered by the FutureBuilder below.
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.hasData) return widget.builder(context, snapshot.data as T, _reload);
        final body = snapshot.hasError
            ? Center(child: ErrorView(error: snapshot.error!, onRetry: _reload))
            : const Center(child: CircularProgressIndicator());
        final title = widget.title;
        return title == null ? body : Scaffold(appBar: AppBar(title: Text(title)), body: body);
      },
    );
  }
}

class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.label, required this.color});

  factory StatusChip.appointment(AppointmentStatus status, String label) {
    final color = switch (status) {
      AppointmentStatus.scheduled => Colors.blue,
      AppointmentStatus.checkedIn => Colors.orange,
      AppointmentStatus.inVisit => Colors.deepPurple,
      AppointmentStatus.completed => Colors.green,
      AppointmentStatus.cancelled => Colors.grey,
    };
    return StatusChip(label: label, color: color);
  }

  factory StatusChip.payment(Billing billing) {
    final color = switch (billing.status) {
      PaymentStatus.notSet => Colors.grey,
      PaymentStatus.pending => Colors.orange,
      PaymentStatus.paid => Colors.green,
    };
    return StatusChip(label: billing.statusDisplay, color: color);
  }

  final String label;
  final MaterialColor color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.shade50,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(color: color.shade800, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }
}
