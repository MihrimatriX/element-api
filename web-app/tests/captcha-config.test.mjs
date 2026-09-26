import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("captcha config wiring", () => {
  it("CaptchaWidget gates on VITE_CAPTCHA_SITE_KEY", () => {
    const cfg = readFileSync(join(root, "src/lib/captcha.ts"), "utf8");
    const widget = readFileSync(join(root, "src/components/CaptchaWidget.tsx"), "utf8");
    assert.match(cfg, /VITE_CAPTCHA_SITE_KEY/);
    assert.match(cfg, /isCaptchaConfigured/);
    assert.match(widget, /isCaptchaConfigured/);
    assert.match(widget, /challenges\.cloudflare\.com\/turnstile/);
  });

  it("Login and Register send captchaToken when configured", () => {
    const login = readFileSync(join(root, "src/pages/Login.tsx"), "utf8");
    const register = readFileSync(join(root, "src/pages/Register.tsx"), "utf8");
    for (const src of [login, register]) {
      assert.match(src, /CaptchaWidget/);
      assert.match(src, /captchaToken/);
      assert.match(src, /Robot olmadığını doğrula/);
    }
  });
});
