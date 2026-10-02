/** Product surface map: the atlas → lab → notebook path first; commerce is a demoted demo. */
export const primaryRoutes = [
  { to: "/periodic", label: "Tablo" },
  { to: "/compounds", label: "Bileşikler" },
  { to: "/lab", label: "Lab" },
  { to: "/collection", label: "Defter" },
  { to: "/nasil", label: "El kitabı" },
] as const;

/** Visible API shortcut in the header, not buried in "Daha fazla". */
export const apiShortcut = { to: "/developers", label: "API" } as const;

/** Secondary pages under "Daha fazla". */
export const moreRoutes = [
  { to: "/sozluk", label: "Sözlük" },
  { to: "/docs", label: "API dokümanları" },
  { to: "/data", label: "Kaynaklar ve veri" },
  { to: "/kilavuz", label: "Sistem kılavuzu" },
  { to: "/hakkinda", label: "Hakkında" },
  { to: "/feedback", label: "Geri bildirim" },
  // Frozen trade demo: reachable, not a primary product surface.
  { to: "/demo", label: "Kredi simülasyonu" },
] as const;

/** Where the retired /stack page redirects. */
export const STACK_REDIRECT = "/hakkinda";

/** A labelled nav destination. */
export interface NavRoute {
  readonly to: string;
  readonly label: string;
}

/** The "Daha fazla" routes for `paths`, in that order. */
function pickMore(...paths: string[]): NavRoute[] {
  return paths.flatMap((path) => moreRoutes.filter((route) => route.to === path));
}

/** Grouped site map shared by the footer and the mobile menu. */
export const siteMap: readonly { title: string; routes: readonly NavRoute[] }[] = [
  { title: "Keşif", routes: primaryRoutes },
  {
    title: "Geliştirici",
    routes: [apiShortcut, ...pickMore("/docs", "/data", "/kilavuz")],
  },
  {
    title: "Proje",
    routes: pickMore("/hakkinda", "/sozluk", "/feedback", "/demo"),
  },
];

/** Detail routes that belong to a nav item (e.g. /element/fe lights up "Tablo"). */
const NAV_ALIASES: Record<string, readonly string[]> = {
  "/periodic": ["/element"],
  "/compounds": ["/compound"],
  "/developers": ["/docs"],
};

/** True when `pathname` is `to`, below it (/lab/formula) or one of its detail aliases. */
export function isNavActive(to: string, pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  return [to, ...(NAV_ALIASES[to] ?? [])].some(
    (base) => path === base || path.startsWith(`${base}/`),
  );
}
