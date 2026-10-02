import { Link } from "react-router-dom";
import { siteMap } from "../../productNav";
import { BrandLink } from "./BrandLink";

/** Site footer: brand and slogan, grouped site map, data/licence line. */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-canvas-2/50">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] md:gap-8">
        <div className="max-w-xs">
          <BrandLink />
          <p className="mt-5 font-display text-lg font-semibold tracking-tight text-ink">
            Atomdan bileşiğe.
          </p>
          <p className="mt-2 text-sm leading-6 text-ink-3">
            Türkçe kimya atlası, laboratuvar ve açık bilimsel API.
          </p>
        </div>
        <nav
          aria-label="Site haritası"
          className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-3"
        >
          {siteMap.map((group) => (
            <div key={group.title}>
              <h2 className="font-sans text-[13px] font-medium tracking-normal text-ink">
                {group.title}
              </h2>
              <ul className="mt-4 grid gap-2.5">
                {group.routes.map((route) => (
                  <li key={route.to}>
                    <Link
                      to={route.to}
                      className="rounded-sm text-sm text-ink-3 transition-colors hover:text-ink"
                    >
                      {route.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-6 text-[13px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>Veriler: PubChem · Kod: MIT lisansı</p>
          <p className="font-mono tabular">© {new Date().getFullYear()} ElementAPI</p>
        </div>
      </div>
    </footer>
  );
}
