import { Link, useLocation } from "react-router-dom";
import { SearchX } from "lucide-react";
import Seo from "../components/Seo";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";

/** 404 for unknown URLs, with the main destinations one click away. */
export default function NotFound() {
  const { pathname } = useLocation();
  return (
    <main className="container-page pt-10 pb-24 lg:pt-14">
      <Seo
        title="Sayfa bulunamadı · ElementAPI"
        description="Bu bağlantı artık geçerli olmayabilir."
        path={pathname}
        noIndex
      />
      <EmptyState
        icon={SearchX}
        title="Sayfa bulunamadı"
        titleAs="h1"
        size="page"
        actions={
          <>
            <Button asChild>
              <Link to="/periodic">Periyodik tablo</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/lab">Laboratuvar</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">Ana sayfa</Link>
            </Button>
          </>
        }
      >
        <p>
          <span className="font-mono text-ink">{pathname}</span> adresinde bir
          sayfa yok. Bağlantı eskimiş olabilir; aşağıdan devam edebilirsin.
        </p>
      </EmptyState>
    </main>
  );
}
