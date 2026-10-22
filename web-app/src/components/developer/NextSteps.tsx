import { BookOpenText, FileJson, Network, SquareTerminal } from "lucide-react";
import { LinkCard } from "@/components/ui/link-card";

const PAGES = [
  {
    to: "/docs",
    icon: SquareTerminal,
    title: "Deneme tezgâhı",
    description: "Fe veya H₂O iste, parametreleri dene, ETag ile 304 al.",
  },
  {
    to: "/kilavuz",
    icon: Network,
    title: "Sistem kılavuzu",
    description: "Kapı, atlas ana bilgisayarı ve servislerin nasıl bağlandığı.",
  },
  {
    to: "/data",
    icon: BookOpenText,
    title: "Kaynaklar ve veri",
    description: "Hangi alan hangi kaynaktan gelir, kapsam nerede biter.",
  },
];

const CONTRACTS = [
  { label: "v2 OpenAPI", href: "/openapi.json" },
  { label: "Element JSON şeması", href: "/schema/elements.schema.json" },
  { label: "Bileşik JSON şeması", href: "/schema/compounds.schema.json" },
];

/** Where to go from /developers: docs, system guide and data pages, plus the machine-readable contracts. */
export function NextSteps() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="grid gap-4">
        {PAGES.map((page) => (
          <LinkCard key={page.to} {...page} meta={page.to} />
        ))}
      </div>
      <div className="panel p-6">
        <h3 className="font-sans text-base font-semibold tracking-normal text-ink">
          Makine sözleşmeleri
        </h3>
        <p className="mt-1.5 text-sm leading-6 text-ink-2">
          İstemci üretmek veya yanıtı doğrulamak için.
        </p>
        <ul className="mt-4 border-t border-line">
          {CONTRACTS.map((contract) => (
            <li key={contract.href} className="border-b border-line">
              <a
                href={contract.href}
                className="group flex items-center justify-between gap-4 rounded-sm py-3"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink transition-colors group-hover:text-brand-ink">
                    {contract.label}
                  </span>
                  <span className="block truncate font-mono text-xs text-ink-3">
                    {contract.href}
                  </span>
                </span>
                <FileJson
                  aria-hidden="true"
                  strokeWidth={1.75}
                  className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-ink"
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
