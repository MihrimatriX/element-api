import type { ElementFamily } from "@/components/ui/element-tile";
import { Section } from "@/components/ui/section";
import { categoryLabels, familyColor, familyOf } from "@/services/elementData";
import { Specimen } from "./Specimen";

const surfaces = [
  { token: "canvas", role: "Sayfa", className: "bg-canvas" },
  { token: "canvas-2", role: "Bant", className: "bg-canvas-2" },
  { token: "surface", role: "Kart", className: "bg-surface" },
  { token: "surface-2", role: "Yükseltilmiş", className: "bg-surface-2" },
  { token: "surface-3", role: "Basılı", className: "bg-surface-3" },
];

const inks = [
  { token: "ink", role: "Başlık, ana değer", className: "text-ink" },
  { token: "ink-2", role: "Gövde metni", className: "text-ink-2" },
  { token: "ink-3", role: "Etiket, açıklama", className: "text-ink-3" },
  { token: "ink-4", role: "Yalnızca süs", className: "text-ink-4" },
];

const accents = [
  { token: "brand", className: "bg-brand" },
  { token: "brand-ink", className: "bg-brand-ink" },
  { token: "success", className: "bg-success" },
  { token: "warning", className: "bg-warning" },
  { token: "danger", className: "bg-danger" },
  { token: "info", className: "bg-info" },
];

/** Each family swatch with the label the app shows, plus the grey of unclassified elements. */
const families: [ElementFamily, string][] = [
  ...Object.entries(categoryLabels).map(
    ([category, label]): [ElementFamily, string] => [familyOf(category), label],
  ),
  ["unknown", "Bilinmiyor"],
];

const radii = ["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl"];
const shadows = ["shadow-xs", "shadow-sm", "shadow-md", "shadow-lg", "shadow-glow"];

/** Tokens: surfaces, ink, accents, families, type scale, radii and shadows. */
export function FoundationsSection() {
  return (
    <Section
      id="temel"
      eyebrow="01"
      title="Temeller"
      description="Yeşil tonlu mineral yüzeyler, tek vurgu (kuprit) ve aile renkleri. Bileşenler yalnızca bu jetonları kullanır."
    >
      <div className="grid gap-5">
        <Specimen title="Yüzeyler" note="bg-canvas … bg-surface-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {surfaces.map((surface) => (
              <div key={surface.token}>
                <div
                  className={`h-20 rounded-lg border border-line shadow-xs ${surface.className}`}
                />
                <p className="mt-2 font-mono text-xs text-ink">{surface.token}</p>
                <p className="text-xs text-ink-3">{surface.role}</p>
              </div>
            ))}
          </div>
        </Specimen>

        <div className="grid gap-5 lg:grid-cols-2">
          <Specimen title="Mürekkep" note="text-ink … text-ink-4">
            <ul className="grid gap-3">
              {inks.map((ink) => (
                <li key={ink.token} className="flex items-baseline justify-between gap-4">
                  <span className={`text-[15px] ${ink.className}`}>Atomdan bileşiğe.</span>
                  <span className="font-mono text-xs text-ink-3">
                    {ink.token} · {ink.role}
                  </span>
                </li>
              ))}
            </ul>
          </Specimen>
          <Specimen title="Vurgu ve durum" note="tek vurgu: kuprit">
            <div className="grid grid-cols-3 gap-3">
              {accents.map((accent) => (
                <div key={accent.token} className="flex items-center gap-2.5">
                  <span className={`size-7 rounded-md border border-line ${accent.className}`} />
                  <span className="font-mono text-xs text-ink-2">{accent.token}</span>
                </div>
              ))}
            </div>
          </Specimen>
        </div>

        <Specimen title="Element aileleri" note="--color-family-*">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
            {families.map(([key, label]) => (
              <div key={key} className="flex items-center gap-3">
                <span
                  className="size-5 rounded-sm border border-line bg-(--swatch)"
                  style={{ "--swatch": familyColor(key) }}
                />
                <span className="text-sm text-ink-2">{label}</span>
              </div>
            ))}
          </div>
        </Specimen>

        <Specimen title="Yazı ölçeği" note="Bricolage Grotesque · Geist · Geist Mono">
          <div className="grid gap-6">
            <p className="font-display text-display font-semibold tracking-tight text-ink">
              Atomdan bileşiğe.
            </p>
            <p className="font-display text-display-sm font-semibold tracking-tight text-ink">
              Periyodik tablo
            </p>
            <p className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              Geçiş metalleri
            </p>
            <p className="text-base font-semibold text-ink">Demir neden paslanır?</p>
            <p className="max-w-prose text-[15px] leading-7 text-ink-2">
              Demir, nemli havada oksijenle birleşerek demir(III) oksit oluşturur.
              Gövde metni 15 piksel, satır yüksekliği 28 piksel ve en fazla 65
              karakter genişliğindedir.
            </p>
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
              <span className="eyebrow">Element 26</span>
              <span className="text-[13px] text-ink-3">Etiket ve açıklama</span>
              <span className="font-mono text-ink tabular">55,845 g/mol</span>
            </div>
          </div>
        </Specimen>

        <div className="grid gap-5 lg:grid-cols-2">
          <Specimen title="Köşe yarıçapları" note="6 · 8 · 12 · 16 · 22">
            <div className="flex flex-wrap gap-4">
              {radii.map((radius) => (
                <div key={radius} className="text-center">
                  <div className={`size-14 border border-line-strong bg-surface-2 ${radius}`} />
                  <p className="mt-2 font-mono text-xs text-ink-3">{radius.slice(8)}</p>
                </div>
              ))}
            </div>
          </Specimen>
          <Specimen title="Derinlik" note="gölgeler yüzey tonunda">
            <div className="flex flex-wrap gap-4">
              {shadows.map((shadow) => (
                <div key={shadow} className="text-center">
                  <div className={`size-14 rounded-lg bg-surface-2 ${shadow}`} />
                  <p className="mt-2 font-mono text-xs text-ink-3">{shadow.slice(7)}</p>
                </div>
              ))}
            </div>
          </Specimen>
        </div>
      </div>
    </Section>
  );
}
