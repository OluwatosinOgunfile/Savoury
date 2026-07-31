import { createClient } from "@supabase/supabase-js";
import { appEnv, warnAboutUnsafeClientSecrets } from "@/lib/env";

warnAboutUnsafeClientSecrets();

export const supabaseConfig = {
  url: appEnv.supabaseUrl,
  anonKey: appEnv.supabaseAnonKey,
  jwksUrl: appEnv.supabaseJwksUrl,
};

export const isSupabaseConfigured = appEnv.isSupabaseConfigured;

export const supabase = isSupabaseConfigured
  ? createClient(appEnv.supabaseUrl, appEnv.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
