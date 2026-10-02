import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");

describe("captcha config wiring", () => {
  it("CaptchaWidget gates on VITE_CAPTCHA_SITE_KEY", () => {
    const cfg = read("src/lib/captcha.ts");
    const widget = read("src/components/CaptchaWidget.tsx");
    assert.match(cfg, /VITE_CAPTCHA_SITE_KEY/);
    assert.match(cfg, /isCaptchaConfigured/);
    assert.match(widget, /isCaptchaConfigured/);
    assert.match(widget, /challenges\.cloudflare\.com\/turnstile/);
  });

  it("renders the Turnstile widget in the dark theme of the UI", () => {
    assert.match(read("src/components/CaptchaWidget.tsx"), /theme:\s*"dark"/);
  });

  it("Login and Register send captchaToken when configured", () => {
    for (const page of ["src/pages/Login.tsx", "src/pages/Register.tsx"]) {
      const src = read(page);
      assert.match(src, /CaptchaWidget/, page);
      assert.match(src, /captchaToken/, page);
      assert.match(src, /Robot olmadığını doğrula/, page);
      // Warns when the server expects a captcha this build cannot show.
      assert.match(src, /serverRequiresCaptcha=\{capabilities\.captcha\}/, page);
    }
  });
});
