import { Link, useLocation } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import Seo from "../components/Seo";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";

/** Shown on account and commerce routes when the build has accounts switched off (atlas-only deploy). */
export default function FeatureUnavailable() {
  const { pathname } = useLocation();
  return (
    <main className="container-page pt-10 pb-24 lg:pt-14">
      <Seo
        title="Hesap kapalı · ElementAPI"
        description="Hesap ve ticaret servisleri bu kurulumda kapalı. Tablo, laboratuvar ve defter açık."
        path={pathname}
        noIndex
      />
      <EmptyState
        icon={LockKeyhole}
        title="Bu kurulumda hesap kapalı"
        titleAs="h1"
        size="page"
        actions={
          <>
            <Button asChild>
              <Link to="/lab">Laboratuvara git</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/collection">Defteri aç</Link>
            </Button>
          </>
        }
      >
        <p>
          Hesap ve ticaret servisleri bu kurulumda kapalı. Periyodik tablo,
          laboratuvar ve defter açık; ilerlemen bu tarayıcıda saklanır.
        </p>
      </EmptyState>
    </main>
  );
}
