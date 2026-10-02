import { Section } from "@/components/ui/section";
import { cn } from "@/lib/utils";
import type { AtlasFields } from "@/services/science";

/** "Nerelerde kullanılır?" (numbered uses with a scope note) and the optional short story. */
export function RecordOverview({ editorial }: { editorial?: AtlasFields["editorial"] }) {
  const uses = editorial?.uses ?? [];
  return (
    <Section id="overview" title="Nerelerde kullanılır?">
      <div
        className={cn(
          "grid gap-8 xl:gap-10",
          editorial?.story ? "xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" : "max-w-2xl",
        )}
      >
        <div>
          {uses.length ? (
            <ol className="divide-y divide-line border-y border-line">
              {uses.map((use, index) => (
                <li key={use} className="flex items-baseline gap-4 py-3.5 text-[15px] text-ink">
                  <span className="font-mono text-xs text-ink-3 tabular">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {use}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[15px] text-ink-2">Bu kayıt için kullanım alanı henüz eklenmedi.</p>
          )}
          <p className="mt-4 max-w-prose text-[13px] leading-5 text-ink-3">
            Kullanım alanları saf maddeyi, bileşiklerini veya özel malzeme biçimlerini kapsayabilir;
            ürünün kimyasal biçimi belirleyicidir.
          </p>
        </div>
        {editorial?.story && (
          <aside className="panel p-6">
            <h3 className="font-sans text-base font-semibold tracking-normal">Kısa hikâyesi</h3>
            <p className="mt-3 max-w-prose text-[15px] leading-7 text-ink-2">{editorial.story}</p>
          </aside>
        )}
      </div>
    </Section>
  );
}
