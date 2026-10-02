import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { Stat, StatGrid } from "@/components/ui/stat";
import { ApiKeysPanel } from "../components/commerce/ApiKeysPanel";
import { useHoldings, useOrders } from "../components/commerce/data";
import { HoldingsTable } from "../components/commerce/HoldingsTable";
import { holdingValue } from "../components/commerce/model";
import { OrdersTable } from "../components/commerce/OrdersTable";
import { WebhooksPanel } from "../components/commerce/WebhooksPanel";
import Seo from "../components/Seo";
import { useCommerce } from "../context/commerce";
import { useSelectedElement } from "../context/selection";
import { formatFixed, formatNumber } from "../lib/format";
import { elementService, type BoardRow } from "../services/api";

const ORDERS_POLL_MS = 15_000;

const GUEST_FACTS = [
  { term: "Cüzdan", detail: "10.000 sanal KREDI ile açılır; gerçek para değil." },
  {
    term: "API anahtarı",
    detail: "Giriş sana bir oturum jetonu verir; ilk ticaret anahtarın otomatik üretilir.",
  },
  { term: "Veri API", detail: "Bilimsel v2 anahtar istemez; cüzdan ve siparişler (v1) ister." },
];

/** /account: wallet, holdings, orders, API keys and webhooks for the signed-in user; a sign-in prompt for guests. */
export default function Account() {
  const { isAuthenticated } = useSelectedElement();
  return (
    <main className="container-page pb-24 pt-10 lg:pt-14">
      <Seo
        title="Hesap · ElementAPI"
        description="Cüzdan ve API anahtarı."
        path="/account"
        noIndex
      />
      {isAuthenticated ? <AccountOverview /> : <GuestAccount />}
    </main>
  );
}

/** What a guest gets after signing in, with sign-in and register links. */
function GuestAccount() {
  return (
    <>
      <PageHeader
        eyebrow="Hesap"
        title="Hesabım"
        lead="Cüzdan, API anahtarları ve webhook tek yerde. Fe gramı keşif defterine yazılmaz."
        actions={
          <>
            <Button asChild size="lg">
              <Link to="/login?returnTo=/account">Giriş yap</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/register">Kayıt ol</Link>
            </Button>
          </>
        }
      />
      <dl className="panel mt-12 grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
        {GUEST_FACTS.map((fact) => (
          <div key={fact.term} className="p-5">
            <dt className="eyebrow">{fact.term}</dt>
            <dd className="mt-2 text-sm leading-6 text-ink-2">{fact.detail}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** Signed-in console: wallet stats, holdings, orders and developer access. */
function AccountOverview() {
  const { elements, walletElx, refreshWallet } = useCommerce();
  const holdings = useHoldings(true);
  const orders = useOrders(true, ORDERS_POLL_MS);
  const [board, setBoard] = useState<BoardRow[]>([]);

  useEffect(() => {
    elementService.getBoard().then(
      (rows) => setBoard(rows ?? []),
      () => undefined,
    );
  }, []);

  const bidBySymbol = useMemo(
    () => new Map(board.map((row) => [row.symbol.toUpperCase(), row.bid])),
    [board],
  );
  const bidOf = (symbol: string) => bidBySymbol.get(symbol.toUpperCase());

  const holdingRows = holdings.state.status === "ready" ? holdings.state.rows : null;
  const orderRows = orders.state.status === "ready" ? orders.state.rows : null;
  const portfolioValue =
    holdingRows && board.length > 0
      ? holdingRows.reduce((sum, row) => sum + (holdingValue(row, bidOf(row.symbol)) ?? 0), 0)
      : null;
  const delivered = orderRows?.filter((order) => order.status === "Completed").length;

  return (
    <>
      <PageHeader
        eyebrow="Hesap · sanal KREDI"
        title="Hesabım"
        lead="Kasa kredisi sanal (KREDI), gerçek para değil. API yanıtında balanceElx alanı ekranda kredi olarak görünür. Laboratuvardaki su keşfi burayı değiştirmez."
      />

      <StatGrid className="mt-10">
        <Stat
          label="Bakiye"
          value={walletElx == null ? "—" : formatFixed(walletElx, 2)}
          unit="kredi"
        />
        <Stat
          label="Varlık değeri"
          value={portfolioValue == null ? "—" : formatFixed(portfolioValue, 2)}
          unit="kredi"
          hint="Bugünkü satış fiyatıyla"
        />
        <Stat
          label="Elindeki ürün"
          value={holdingRows ? formatNumber(holdingRows.length) : "—"}
        />
        <Stat
          label="Teslim edilen sipariş"
          value={delivered == null ? "—" : formatNumber(delivered)}
          unit={orderRows ? `/ ${formatNumber(orderRows.length)}` : undefined}
        />
      </StatGrid>

      <Section
        title="Varlıklar"
        description="Kasandaki gramlar. Satış piyasa sayfasından yapılır."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/market">Piyasaya git</Link>
          </Button>
        }
      >
        <HoldingsTable
          state={holdings.state}
          elements={elements}
          bidOf={bidOf}
          onRetry={holdings.retry}
          // `state.slug` preselects this row's product in Market's sell form; the symbol alone
          // would pick pure Na for an NaCl row when the user holds both.
          action={(row) => (
            <Button asChild variant="ghost" size="sm">
              <Link to={`/market?symbol=${row.symbol}`} state={{ slug: row.compoundSlug }}>
                Sat
              </Link>
            </Button>
          )}
        />
      </Section>

      <Section
        title="Siparişler"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/shop">Mağazaya git</Link>
          </Button>
        }
      >
        <OrdersTable
          state={orders.state}
          elements={elements}
          onRetry={() => void orders.reload()}
          emptyHint="Mağazadan bir ürün al; sipariş adımları burada görünür."
        />
      </Section>

      <Section
        title="Geliştirici erişimi"
        description="API anahtarları ve webhook'lar bu hesaba bağlıdır."
      >
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <ApiKeysPanel onDashboardKeyChange={refreshWallet} />
          <WebhooksPanel />
        </div>
      </Section>
    </>
  );
}
