/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_SECRET_KEY?: string;
  readonly VITE_AUTH_REDIRECT_URL?: string;
  readonly VITE_PAYSTACK_PUBLIC_KEY?: string;
  readonly VITE_FLUTTERWAVE_PUBLIC_KEY?: string;
  readonly VITE_STRIPE_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __SUPABASE_JWKS_URL__: string;
