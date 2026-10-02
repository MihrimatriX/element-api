import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { GuideLayout } from "./GuideLayout";

const NAV_WIDTHS = ["w-24", "w-32", "w-28", "w-36", "w-24", "w-32", "w-28"];

/** Loading state shaped like the guide: search box and nav lines, then a page header and facts. */
export function GuideSkeleton() {
  return (
    <GuideLayout
      sidebar={
        <>
          <Skeleton className="h-10 w-full" />
          <div className="mt-8 space-y-4 pl-3">
            {NAV_WIDTHS.map((width, index) => (
              <Skeleton key={index} className={cn("h-3.5", width)} />
            ))}
          </div>
        </>
      }
      toolbar={
        <>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </>
      }
    >
      <p role="status" className="sr-only">
        Kılavuz yükleniyor…
      </p>
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-5 h-11 w-[min(26rem,85%)] md:h-13" />
      <Skeleton className="mt-5 h-5 w-[min(36rem,95%)]" />
      <Skeleton className="mt-2.5 h-5 w-[min(24rem,70%)]" />
      <div className="mt-10 space-y-5 border-t border-line pt-5">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="grid grid-cols-[2fr_3fr] gap-4">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-full" />
          </div>
        ))}
      </div>
    </GuideLayout>
  );
}
