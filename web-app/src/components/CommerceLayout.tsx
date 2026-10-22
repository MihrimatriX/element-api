import { Link, Outlet } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { CommerceProvider, useCommerce } from "../context/commerce";
import { Notice } from "./ui/notice";

/** Slim warning strip under the header marking a KREDI simulation page. */
function DemoBanner() {
  return (
    <div role="note" className="border-b border-warning/20 bg-warning-soft">
      <div className="container-page flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[13px] text-ink-2">
        <TriangleAlert
          aria-hidden="true"
          strokeWidth={1.75}
          className="size-3.5 shrink-0 text-warning"
        />
        <p className="min-w-0 flex-1">
          <span className="font-medium text-ink">Demo</span> · KREDI sanal;
          gerçek para, ödeme veya kargo yok.
        </p>
        <Link to="/collection" className="text-link font-medium">
          Keşiflerime dön
        </Link>
      </div>
    </div>
  );
}

function OfflineNotice() {
  const { loading, dataAvailable } = useCommerce();
  if (loading || dataAvailable) return null;
  return (
    <div className="container-page pt-6">
      <Notice tone="warning" title="Bağlantı kurulamadı">
        Temel element bilgilerini inceleyebilirsin; güncel fiyat ve alışveriş
        geçici olarak kullanılamıyor.
      </Notice>
    </div>
  );
}

/** Route layout for /demo: the demo banner above the page. */
export function DemoLayout() {
  return (
    <>
      <DemoBanner />
      <Outlet />
    </>
  );
}

/** Route layout for /market, /shop, /account: live prices + wallet, demo banner, offline notice. */
export function CommerceLayout() {
  return (
    <CommerceProvider>
      <DemoBanner />
      <OfflineNotice />
      <Outlet />
    </CommerceProvider>
  );
}
