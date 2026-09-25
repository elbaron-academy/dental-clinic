import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'src/api/api_client.dart';
import 'src/api/dental_api.dart';
import 'src/app.dart';
import 'src/auth/auth_controller.dart';
import 'src/config.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final api = DentalApi(ApiClient(baseUrl: AppConfig.apiBaseUrl));
  final auth = AuthController(api: api)..restore();
  runApp(
    MultiProvider(
      providers: [
        Provider<DentalApi>.value(value: api),
        ChangeNotifierProvider<AuthController>.value(value: auth),
      ],
      child: const DentalClinicApp(),
    ),
  );
}
