import { Component, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { track } from "../services/diagnostics";
import Seo from "./Seo";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/empty-state";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** A new value clears the error and renders `children` again (the router passes the pathname). */
  resetKey?: string;
}

/**
 * Crash screen in place of a page that threw while rendering. App wraps the
 * routes in one inside the shell; main.tsx wraps the whole app in another, which
 * sits outside the router, so the screen links with a plain anchor and
 * recovers with a full reload.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    track("client_error");
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey)
      this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="container-page pt-10 pb-24 lg:pt-14">
        <Seo
          title="Sayfa açılamadı · ElementAPI"
          description="Bu sayfa açılırken bir sorun oluştu."
          path={window.location.pathname}
          noIndex
        />
        <div role="alert">
          <EmptyState
            icon={TriangleAlert}
            title="Bu sayfa açılırken bir sorun oluştu"
            titleAs="h1"
            size="page"
            actions={
              <>
                <Button onClick={() => window.location.reload()}>
                  Yeniden dene
                </Button>
                <Button asChild variant="outline">
                  <a href="/">Ana sayfa</a>
                </Button>
              </>
            }
          >
            <p>
              Kaydedilmiş keşiflerin silinmedi. Sayfayı yenileyerek tekrar
              deneyebilirsin.
            </p>
          </EmptyState>
        </div>
      </main>
    );
  }
}
