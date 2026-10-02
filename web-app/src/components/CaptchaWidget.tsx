import { useEffect, useRef } from "react";
import { Notice } from "@/components/ui/notice";
import { CAPTCHA_SITE_KEY, isCaptchaConfigured } from "../lib/captcha";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_ID = "cf-turnstile-api";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Loads the Turnstile script once per page, however many widgets ask for it. */
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    document.head.appendChild(script);
  }
  const loading = script;
  return new Promise((resolve, reject) => {
    loading.addEventListener("load", () => resolve(), { once: true });
    loading.addEventListener(
      "error",
      () => reject(new Error("Turnstile load failed")),
      { once: true },
    );
  });
}

interface CaptchaWidgetProps {
  /** Receives the Turnstile token, or "" when it expires or fails. */
  onToken: (token: string) => void;
  /** The server asks for a captcha (`GET /auth/capabilities`); warns when this build cannot show one. */
  serverRequiresCaptcha?: boolean;
}

/**
 * Cloudflare Turnstile check for the auth forms. Renders only when the build has
 * `VITE_CAPTCHA_SITE_KEY`; without it, warns if the server nevertheless expects a token.
 */
export default function CaptchaWidget({
  onToken,
  serverRequiresCaptcha = false,
}: CaptchaWidgetProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!isCaptchaConfigured()) return;
    let cancelled = false;
    let widgetId: string | null = null;

    loadTurnstile()
      .then(() => {
        if (cancelled || !hostRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(hostRef.current, {
          sitekey: CAPTCHA_SITE_KEY,
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": () => onTokenRef.current(""),
        });
      })
      .catch(() => {
        if (!cancelled) onTokenRef.current("");
      });

    return () => {
      cancelled = true;
      if (widgetId === null || !window.turnstile) return;
      try {
        window.turnstile.remove(widgetId);
      } catch {
        // The widget is already gone (e.g. its iframe was removed with the form).
      }
    };
  }, []);

  if (!isCaptchaConfigured())
    return serverRequiresCaptcha ? (
      <Notice tone="warning" role="alert">
        Sunucu captcha istiyor ama bu derlemede site anahtarı yok. Web imajını
        VITE_CAPTCHA_SITE_KEY ile yeniden derle.
      </Notice>
    ) : null;

  return (
    <div data-captcha className="grid gap-2">
      <p className="text-sm font-medium text-ink">Güvenlik doğrulaması</p>
      <div ref={hostRef} className="min-h-[65px]" />
    </div>
  );
}
