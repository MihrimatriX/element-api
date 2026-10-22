import { Skeleton } from "./ui/skeleton";

/** Suspense fallback while a route chunk loads: a skeleton shaped like PageHeader plus a content block. */
export default function RouteFallback() {
  return (
    <main aria-busy="true" className="container-page pt-10 pb-24 lg:pt-14">
      <p role="status" className="sr-only">
        Sayfa yükleniyor…
      </p>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-5 h-11 w-[min(30rem,85%)] md:h-13" />
      <Skeleton className="mt-5 h-5 w-[min(38rem,95%)]" />
      <Skeleton className="mt-2.5 h-5 w-[min(26rem,70%)]" />
      <Skeleton className="mt-12 h-80 w-full rounded-xl" />
    </main>
  );
}
