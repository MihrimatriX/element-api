/** Product surface map — primary atlas/lab path; commerce is a demoted demo. */
export const primaryRoutes = [
  { to: "/periodic", label: "Tablo" },
  { to: "/compounds", label: "Bileşikler" },
  { to: "/lab", label: "Lab" },
  { to: "/collection", label: "Defter" },
  { to: "/nasil", label: "El kitabı" },
] as const;

/** Visible product-site API shortcut — not buried in More. */
export const apiShortcut = { to: "/developers", label: "API" } as const;

export const moreRoutes = [
  { to: "/sozluk", label: "Sözlük" },
  { to: "/docs", label: "API dokümanları" },
  { to: "/data", label: "Kaynaklar ve veri" },
  { to: "/hakkinda", label: "Hakkında" },
  { to: "/feedback", label: "Geri bildirim" },
  // Frozen trade demo — reachable, not a primary product surface.
  { to: "/demo", label: "Kredi simülasyonu" },
] as const;

export const STACK_REDIRECT = "/hakkinda";

export function isCommerceDemoPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  return /^\/(demo|market|shop|values|trading)(\/|$)/.test(path);
}

export function isPrimaryProductPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  if (path === "/" || path === "/periodic") return true;
  if (path.startsWith("/element/") || path.startsWith("/compound/"))
    return true;
  if (path === "/compounds" || path.startsWith("/lab")) return true;
  if (path === "/collection" || path === "/nasil") return true;
  return false;
}
