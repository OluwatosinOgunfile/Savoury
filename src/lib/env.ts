function clean(value: string | undefined) {
  return value?.trim() || "";
}

function deriveJwksUrl(supabaseUrl: string) {
  if (!supabaseUrl) return "";
  return `${supabaseUrl.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`;
}

const supabaseUrl = clean(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY);
const configuredJwksUrl = clean(typeof __SUPABASE_JWKS_URL__ === "string" ? __SUPABASE_JWKS_URL__ : "");

export const appEnv = {
  supabaseUrl,
  supabaseAnonKey,
  supabaseJwksUrl: configuredJwksUrl || deriveJwksUrl(supabaseUrl),
  authRedirectUrl: clean(import.meta.env.VITE_AUTH_REDIRECT_URL) || window.location.origin,
  isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  demoAuthEnabled: import.meta.env.DEV && clean(import.meta.env.VITE_ENABLE_DEMO_AUTH).toLowerCase() === "true",
};

export function warnAboutUnsafeClientSecrets() {
  return;
}
