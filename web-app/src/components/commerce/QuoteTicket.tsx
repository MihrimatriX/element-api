import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ElementTile } from "@/components/ui/element-tile";
import { KeyValue } from "@/components/ui/key-value";
import { cn } from "@/lib/utils";
import { formatFixed, formatKredi, formatNumber } from "../../lib/format";
import type { Ticker } from "../../services/api";
import type { ElementItem } from "../../services/elementData";
import { ChangeValue } from "./ChangeValue";
import { familyOf, trendOf } from "./model";
import { Sparkline } from "./Sparkline";

const sparklineTone = { up: "text-success", down: "text-danger", flat: "text-ink-3" };

interface QuoteTicketProps {
  element: ElementItem;
  /** Live ticker for `element`; `null` while it loads or when it is unavailable. */
  ticker: Ticker | null;
  /** Sell form or the sign-in prompt. */
  children: ReactNode;
}

/**
 * The selected element's ticket: last price with its 24 h change and sparkline,
 * ask/bid/spread/stock, a buy link into the shop and the sell area below.
 */
export function QuoteTicket({ element, ticker, children }: QuoteTicketProps) {
  const prices = ticker?.sparkline.map((point) => point.price) ?? [];
  const stock = ticker?.availableStock ?? element.availableStock ?? 0;

  return (
    <section aria-label="Alış satış" className="panel p-5">
      <header className="flex items-start gap-4">
        <div aria-hidden="true" className="w-14 shrink-0">
          <ElementTile
            symbol={element.symbol}
            atomicNumber={element.atomicNumber}
            name={element.name}
            family={familyOf(element.category)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Seçili element · {element.symbol}</p>
          <h2 className="mt-1.5 truncate font-display text-2xl font-semibold tracking-tight text-ink">
            {element.name}
          </h2>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-mono text-3xl leading-none text-ink tabular">
          {ticker ? formatFixed(ticker.last, 4) : "—"}
          <span className="ml-1.5 text-sm text-ink-3">kredi / g</span>
        </p>
        <p className="text-[13px] text-ink-3">
          24 sa <ChangeValue value={ticker?.change24hPct} className="ml-1 text-sm" />
        </p>
      </div>

      {prices.length > 1 && ticker && (
        <figure className="mt-4">
          <Sparkline
            prices={prices}
            className={cn(sparklineTone[trendOf(ticker.change24hPct)])}
          />
          <figcaption className="mt-1.5 flex justify-between font-mono text-xs text-ink-3 tabular">
            <span>En düşük {formatFixed(ticker.low24h, 4)}</span>
            <span>En yüksek {formatFixed(ticker.high24h, 4)}</span>
          </figcaption>
        </figure>
      )}

      <KeyValue
        className="mt-5"
        items={[
          {
            label: "Alış",
            value: (
              <span className="font-mono text-success tabular">
                {formatKredi(ticker?.ask, 4)}
              </span>
            ),
          },
          {
            label: "Satış",
            value: (
              <span className="font-mono text-danger tabular">
                {formatKredi(ticker?.bid, 4)}
              </span>
            ),
          },
          {
            label: "Stok",
            value: (
              <span className="font-mono tabular">
                {formatNumber(stock, { maximumFractionDigits: 0 })} g
              </span>
            ),
          },
        ]}
      />

      <Button asChild size="lg" className="mt-5 w-full">
        <Link to={`/shop?symbol=${element.symbol}`}>
          <ShoppingCart aria-hidden="true" strokeWidth={1.75} />
          Satın al
        </Link>
      </Button>

      <div className="mt-6 border-t border-line pt-5">{children}</div>
    </section>
  );
}
