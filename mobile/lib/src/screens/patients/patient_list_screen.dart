import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/dental_api.dart';
import '../../auth/auth_controller.dart';
import '../../models/models.dart';
import '../../widgets/common.dart';
import '../home/home_shell.dart';
import 'patient_detail_screen.dart';
import 'patient_form_screen.dart';

/// Patient listing and search within the user's scope (PATIENT-004/005).
class PatientListScreen extends StatefulWidget {
  const PatientListScreen({super.key});

  @override
  State<PatientListScreen> createState() => _PatientListScreenState();
}

class _PatientListScreenState extends State<PatientListScreen> {
  final _search = TextEditingController();
  Timer? _debounce;
  PageResult<Patient>? _page;
  Object? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final page = await context.read<DentalApi>().patients(search: _search.text.trim());
      if (mounted) {
        setState(() {
          _page = page;
          _error = null;
        });
      }
    } on Exception catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onSearchChanged(String _) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), _load);
  }

  Future<void> _open(Widget screen) async {
    await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final page = _page;
    return Scaffold(
      appBar: AppBar(title: const Text('Patients'), actions: const [AccountMenu()]),
      floatingActionButton: auth.hasPerm('patients.add_patient')
          ? FloatingActionButton.extended(
              onPressed: () => _open(const PatientFormScreen()),
              icon: const Icon(Icons.person_add_alt),
              label: const Text('Register'),
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _search,
              onChanged: _onSearchChanged,
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Search by name or phone',
              ),
            ),
          ),
          if (_loading) const LinearProgressIndicator(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: _error != null
                  ? ListView(children: [ErrorView(error: _error!, onRetry: _load)])
                  : page == null
                      ? const SizedBox.shrink()
                      : page.results.isEmpty
                          ? ListView(children: const [EmptyText('No patients found.')])
                          : ListView.separated(
                              padding: const EdgeInsets.only(bottom: 96),
                              itemCount: page.results.length,
                              separatorBuilder: (_, __) => const Divider(height: 1),
                              itemBuilder: (context, index) {
                                final patient = page.results[index];
                                return ListTile(
                                  title: Text(patient.fullName),
                                  subtitle: Text(patient.phone),
                                  trailing: patient.isMinor ? const Chip(label: Text('Minor')) : null,
                                  onTap: () => _open(PatientDetailScreen(patientId: patient.id)),
                                );
                              },
                            ),
            ),
          ),
        ],
      ),
    );
  }
}
