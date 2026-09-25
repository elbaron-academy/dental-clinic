/// Build-time configuration.
///
/// Pass the backend origin with
/// `--dart-define=API_BASE_URL=https://clinic.example.com`.
/// The default targets a backend on the host machine from an Android emulator.
class AppConfig {
  const AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000',
  );
}
