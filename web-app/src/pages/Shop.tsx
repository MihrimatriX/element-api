import { useId, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { Section } from "@/components/ui/section";
import { Segmented } from "@/components/ui/segmented";
import { Stat } from "@/components/ui/stat";
import { toast } from "@/components/ui/toast";
import { useCart } from "../components/commerce/cart";
import { CartPanel } from "../components/commerce/CartPanel";
import { useCatalog, useOrders } from "../components/commerce/data";
import { ElementPicker } from "../components/commerce/ElementPicker";
import { elementName, quoteFor, summarizeCart } from "../components/commerce/model";
import { OrdersTable } from "../components/commerce/OrdersTable";
import { SkuCard } from "../components/commerce/SkuCard";
import { SkuCatalog } from "../components/commerce/SkuCatalog";
import Seo from "../components/Seo";
import { useCommerce } from "../context/commerce";
import { useSelectedElement } from "../context/selection";
import { usePolling } from "../hooks/usePolling";
import { formatFixed } from "../lib/format";
import { ApiHttpError } from "../lib/http";
import { matchesSearch } from "../lib/text";
import {
  apiError,
  elementService,
  orderService,
  type BoardRow,
  type CompoundSku,
} from "../services/api";

const PICKS = ["AU", "AG", "CU", "FE", "C", "NA", "AL", "PT"];
const PACKS = ["1", "10", "100"] as const;
type Pack = (typeof PACKS)[number];
const PACK_OPTIONS = PACKS.map((grams) => ({ value: grams, label: `${grams} g` }));
const BOARD_POLL_MS = 15_000;
const ORDERS_POLL_MS = 4_000;

/**
 * /shop: the virtual-KREDI store. Pick an element, a pack size and products priced at the
 * parent element's ask × multiplier; the gram cart checks out one idempotent order per line,
 * and the saga status of every order is polled below.
 */
export default function Shop() {
  const { selectedSymbol, setSelectedSymbol, isAuthenticated } = useSelectedElement();
  const { elements, walletElx, refreshWallet } = useCommerce();
  const navigate = useNavigate();
  const location = useLocation();
  const productsHeadingId = useId();
  const loginHref = `/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`;

  const [board, setBoard] = useState<BoardRow[]>([]);
  const [onlySelected, setOnlySelected] = useState(() =>
    new URLSearchParams(location.search).has("symbol"),
  );
  const [query, setQuery] = useState("");
  const [pack, setPack] = useState<Pack>("10");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutNote, setCheckoutNote] = useState("");

  usePolling(() => {
    elementService.getBoard().then(
      (rows) => setBoard(rows ?? []),
      () => setBoard([]),
    );
  }, BOARD_POLL_MS);

  const quoteOf = (symbol: string) => quoteFor(board, elements, symbol);
  const filterSymbol = onlySelected ? selectedSymbol : null;
  const catalog = useCatalog(filterSymbol);
  const cart = useCart((symbol) => quoteOf(symbol).stock);
  const orders = useOrders(isAuthenticated, ORDERS_POLL_MS, refreshWallet);

  const visibleSkus = useMemo(
    () =>
      catalog.skus.filter((sku) =>
        matchesSearch(query, sku.formula, sku.name, sku.nameTr, sku.slug, sku.elementSymbol),
      ),
    [catalog.skus, query],
  );
  const { lines, subtotal, overStock } = summarizeCart(cart.cart, elements, quoteOf);
  const walletShort = isAuthenticated && walletElx != null && subtotal > walletElx;
  const picks = PICKS.includes(selectedSymbol) ? PICKS : [...PICKS, selectedSymbol];
  const packGrams = Number(pack);

  const showElement = (symbol: string | null) => {
    if (symbol === null) {
      setOnlySelected(false);
      return;
    }
    setSelectedSymbol(symbol);
    setOnlySelected(true);
  };

  const addSku = (sku: CompoundSku) => {
    cart.add(sku, packGrams);
    toast(`${sku.formula} · +${packGrams} g`, { tone: "success", description: "Sepete eklendi." });
  };

  const checkout = async () => {
    if (!isAuthenticated) {
      navigate(loginHref);
      return;
    }
    if (lines.length === 0 || overStock || walletShort) return;
    setSubmitting(true);
    setCheckoutNote("");
    try {
      let accepted = 0;
      // One order per line, in sequence. Each line's requestId is its Idempotency-Key, so retrying
      // after a network error never charges twice; accepted lines leave the cart at once.
      for (const line of lines) {
        const order = await orderService.submitOrder(
          line.element.symbol,
          line.item.qty,
          line.item.slug,
          line.item.requestId,
        );
        orders.upsert(order);
        cart.remove(line.item);
        accepted++;
        setCheckoutNote(`${accepted} sipariş iletildi.`);
      }
      refreshWallet();
      toast("Sipariş iletildi", {
        tone: "success",
        description: "Durumu sayfanın altındaki listeden izleyebilirsin.",
      });
    } catch (error) {
      const detail =
        error instanceof ApiHttpError && error.status === 402
          ? "Cüzdanda yeterli kredi yok."
          : apiError(error, "Sipariş iletilemedi.");
      setCheckoutNote(`${detail} Kalan ürünler sepette. Güvenle tekrar deneyebilirsiniz.`);
    } finally {
      setSubmitting(false);
    }
  };

  const emptyText = filterSymbol
    ? `${elementName(elements, filterSymbol)} için ürün yok. Tümü’ne geç veya başka element seç.`
    : "Aramaya uyan ürün yok.";

  return (
    <main className="container-page pb-24 pt-10 lg:pt-14">
      <Seo
        title="Mağaza · ElementAPI"
        description="Bileşik, allotrop ve preparat. Fiyat, ana element alış × çarpan."
        path="/shop"
      />
      <PageHeader
        eyebrow="Mağaza · sanal KREDI"
        title="Mağaza"
        lead="Sanal KREDI demosu, gerçek para değil. Demir gramı, su SKU’su; bilimsel 214’lük katalog otomatik satılmaz. Paketler 1, 10 ve 100 gram."
        actions={
          !isAuthenticated && (
            <p className="text-sm text-ink-2">
              Gezmek serbest.{" "}
              <Link to="/register" className="text-link">
                Kayıt olunca hesabına 10.000 kredi yüklenir.
              </Link>
            </p>
          )
        }
        aside={
          isAuthenticated && (
            <Stat
              label="Cüzdan"
              value={walletElx == null ? "—" : formatFixed(walletElx, 2)}
              unit="kredi"
              className="min-w-56"
            />
          )
        }
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-8">
        <section aria-labelledby={productsHeadingId} className="min-w-0">
          {/* Keeps the outline h1 → h2 → h3: product cards title themselves with h3. */}
          <h2 id={productsHeadingId} className="sr-only">
            Ürünler
          </h2>
          <div className="panel grid gap-4 p-4">
            <ElementPicker
              symbols={picks}
              elements={elements}
              value={filterSymbol}
              onValueChange={showElement}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <form role="search" className="flex-1" onSubmit={(event) => event.preventDefault()}>
                <SearchField
                  label="Ürünlerde ara"
                  placeholder="Formül, ad, sembol…"
                  value={query}
                  onValueChange={setQuery}
                  resultCount={visibleSkus.length}
                  formatCount={(count) => `${count} ürün`}
                />
              </form>
              <Segmented
                label="Paket gram"
                options={PACK_OPTIONS}
                value={pack}
                onValueChange={setPack}
              />
            </div>
          </div>

          <div className="mt-6 flex items-baseline justify-between gap-3">
            <p className="text-[13px] text-ink-3">
              {catalog.status === "ready" &&
                `${visibleSkus.length} ürün · fiyat = ana element alışı × ürün çarpanı`}
            </p>
            <a href="#sepet" className="text-link text-[13px] lg:hidden">
              Sepete git{lines.length > 0 && ` (${lines.length})`}
            </a>
          </div>
          <div className="mt-3">
            <SkuCatalog
              status={catalog.status}
              skus={visibleSkus}
              filterKey={`${catalog.requestKey}|${query}`}
              emptyText={emptyText}
              onRetry={catalog.retry}
              renderSku={(sku) => {
                const quote = quoteOf(sku.elementSymbol);
                return (
                  <SkuCard
                    key={sku.slug}
                    sku={sku}
                    elementName={elementName(elements, sku.elementSymbol)}
                    unitPrice={quote.ask > 0 ? quote.ask * sku.priceMult : null}
                    stock={quote.stock}
                    inCart={cart.gramsOf(sku)}
                    pack={packGrams}
                    disabled={submitting || quote.stock < packGrams || quote.ask <= 0}
                    onAdd={() => addSku(sku)}
                    onShowElement={() => showElement(sku.elementSymbol)}
                  />
                );
              }}
            />
          </div>
        </section>

        <div className="lg:sticky lg:top-20">
          <CartPanel
            lines={lines}
            subtotal={subtotal}
            walletElx={walletElx}
            isAuthenticated={isAuthenticated}
            overStock={overStock}
            walletShort={walletShort}
            submitting={submitting}
            checkoutNote={checkoutNote}
            onStep={cart.step}
            onRemove={cart.remove}
            onClear={() => cart.setCart([])}
            onCheckout={checkout}
          />
        </div>
      </div>

      <Section
        id="siparisler"
        title="Sipariş durumu"
        description="Her sipariş stok ayırma, ödeme ve kargo adımlarından geçer; liste birkaç saniyede bir yenilenir."
      >
        {isAuthenticated ? (
          <OrdersTable
            state={orders.state}
            elements={elements}
            onRetry={() => void orders.reload()}
            emptyHint="İlk deneme: 1 g Fe."
          />
        ) : (
          <EmptyState
            icon={LogIn}
            title="Takip için giriş"
            actions={
              <Button asChild variant="outline" size="sm">
                <Link to={loginHref}>Giriş yap</Link>
              </Button>
            }
          >
            Siparişlerin ve adımları giriş yaptıktan sonra burada görünür.
          </EmptyState>
        )}
      </Section>
    </main>
  );
}
