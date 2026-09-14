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
    // This is the project's public client key. It is safe to embed in a
    // mobile application; database access is protected by Supabase RLS.
    // Server/service-role keys must never be added here.
    defaultValue: 'sb_publishable_aHNOh4BJvrL3CWDkXUA2qA_QnHvx_ew',
  );

  static bool get hasSupabaseConfiguration =>
      supabaseUrl.startsWith('https://') &&
      supabasePublishableKey.trim().isNotEmpty;
}
