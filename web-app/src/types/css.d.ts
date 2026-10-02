import "react";

declare module "react" {
  interface CSSProperties {
    /** CSS custom properties in inline styles, e.g. `style={{ "--family": "var(--color-family-noble)" }}`. */
    [customProperty: `--${string}`]: string | number | undefined;
  }
}
