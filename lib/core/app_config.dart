class AppConfig {
  const AppConfig._();

  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://www.el7lm.com',
  );
  static const webBaseUrl = String.fromEnvironment(
    'WEB_BASE_URL',
    defaultValue: 'https://www.el7lm.com',
  );
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://mjuaefipdzxfqazzbyke.supabase.co',
  );
  static const supabasePublishableKey = String.fromEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
    defaultValue: '',
  );

  static bool get hasSupabaseConfiguration =>
      supabaseUrl.startsWith('https://') &&
      supabasePublishableKey.trim().isNotEmpty;
}
