function clean(value: string | undefined) {
  return value?.trim() || "";
}

function deriveJwksUrl(supabaseUrl: string) {
  if (!supabaseUrl) return "";
  return `${supabaseUrl.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`;
}

const supabaseUrl = clean(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY);
const browserExposedSecretKey = clean(import.meta.env.VITE_SUPABASE_SECRET_KEY);
const configuredJwksUrl = clean(typeof __SUPABASE_JWKS_URL__ === "string" ? __SUPABASE_JWKS_URL__ : "");

export const appEnv = {
  supabaseUrl,
  supabaseAnonKey,
  supabaseJwksUrl: configuredJwksUrl || deriveJwksUrl(supabaseUrl),
  authRedirectUrl: clean(import.meta.env.VITE_AUTH_REDIRECT_URL) || window.location.origin,
  hasBrowserExposedSupabaseSecretKey: Boolean(browserExposedSecretKey),
  isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
};

export function warnAboutUnsafeClientSecrets() {
  if (appEnv.hasBrowserExposedSupabaseSecretKey) {
    console.warn(
      "VITE_SUPABASE_SECRET_KEY is present, but it is not used by the browser app. VITE_* variables are public in Vite builds. Keep service-role or secret keys on a server only."
    );
  }
}
