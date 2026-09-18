/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly VITE_SCIENCE_API_BASE_URL?: string;
  readonly VITE_ACCOUNTS_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
