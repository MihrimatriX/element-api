import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { fetchJson } from "../lib/http";

/** Optional identity features the server has configured (GET /auth/capabilities). */
export interface AuthCapabilities {
  passwordRecovery: boolean;
  emailVerification: boolean;
  captcha: boolean;
}

const ALL_OFF: AuthCapabilities = {
  passwordRecovery: false,
  emailVerification: false,
  captcha: false,
};

/**
 * Loads the identity service capabilities once. While loading, and when the
 * request fails, every capability reads as off so pages never offer a flow the
 * server cannot complete. Pass `enabled: false` to skip the request.
 */
export function useAuthCapabilities({ enabled = true } = {}): {
  loading: boolean;
  capabilities: AuthCapabilities;
} {
  const [capabilities, setCapabilities] = useState<AuthCapabilities | null>(
    null,
  );

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetchJson<Partial<AuthCapabilities>>(`${API_BASE_URL}/auth/capabilities`, {
      signal: controller.signal,
    })
      .then(({ ok, data }) =>
        setCapabilities(
          ok && data
            ? {
                passwordRecovery: Boolean(data.passwordRecovery),
                emailVerification: Boolean(data.emailVerification),
                captcha: Boolean(data.captcha),
              }
            : ALL_OFF,
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted) setCapabilities(ALL_OFF);
      });
    return () => controller.abort();
  }, [enabled]);

  return {
    loading: enabled && capabilities === null,
    capabilities: capabilities ?? ALL_OFF,
  };
}
