import { Button } from "@/components/ui/button";
import { track } from "../services/diagnostics";
import { Component, type ReactNode } from "react";
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
    if (this.state.failed)
      return (
        <main className="product-error" role="alert">
          <h1>Bu sayfa açılırken bir sorun oluştu.</h1>
          <p>
            Kaydedilmiş keşiflerin silinmedi. Sayfayı yenileyerek tekrar
            deneyebilirsin.
          </p>
          <Button
            variant="default"
            className="btn primary"
            onClick={() => window.location.reload()}
          >
            Yeniden dene
          </Button>{" "}
          <a href="/">Keşfe dön</a>
        </main>
      );
    return this.props.children;
  }
}
