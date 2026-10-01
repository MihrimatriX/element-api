import { Component, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { track } from "../services/diagnostics";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/empty-state";

/**
 * Last-resort crash screen around the whole app. It sits outside the router,
 * so it links with plain anchors and recovers with a full reload.
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    track("client_error");
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main role="alert" className="container-page grid min-h-dvh place-items-center py-16">
        <EmptyState
          icon={TriangleAlert}
          title="Bu sayfa açılırken bir sorun oluştu"
          titleAs="h1"
          size="page"
          className="w-full max-w-2xl"
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
      </main>
    );
  }
}
