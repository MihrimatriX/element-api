/** Build-time Turnstile site key. Empty → widget off (local/dev). */
export const CAPTCHA_SITE_KEY = (
  import.meta.env.VITE_CAPTCHA_SITE_KEY ?? ""
).trim();

/** True when the build has a Turnstile site key, so forms show the captcha. */
export function isCaptchaConfigured(): boolean {
  return CAPTCHA_SITE_KEY.length > 0;
}
