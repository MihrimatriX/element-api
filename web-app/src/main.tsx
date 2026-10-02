import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./styles.css";

/** sessionStorage key: when this tab last reloaded for a missing chunk. */
const CHUNK_RELOAD_KEY = "elementapi:chunk-reload";
/** A chunk that is still missing this soon after a reload is really gone; show the crash screen. */
const CHUNK_RELOAD_WINDOW_MS = 60_000;

/**
 * A redeploy deletes the old hashed `/assets` files, so a tab opened before it
 * fails to load the next lazy route. Reloading fetches the new build and keeps
 * the user in the app instead of on the crash screen. Without sessionStorage
 * there is no loop guard, so the crash screen's "Yeniden dene" is left to do it.
 */
function reloadForNewBuild() {
  try {
    const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY));
    if (Date.now() - lastReload < CHUNK_RELOAD_WINDOW_MS) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    return;
  }
  window.location.reload();
}

window.addEventListener("vite:preloadError", reloadForNewBuild);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
