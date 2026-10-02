import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GuideStep } from "./guide-content";

/**
 * Numbered how-to steps on a vertical rail, read top to bottom. Each card ends with
 * deep links: the first is the main next move, the rest are quieter.
 */
export function GuideSteps({ steps }: { steps: readonly GuideStep[] }) {
  return (
    <ol>
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 pb-4 last:pb-0 sm:gap-x-5"
        >
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute top-11 bottom-1 left-[1.125rem] w-px bg-line-strong"
            />
          )}
          <span
            aria-hidden="true"
            className="mt-4 grid size-9 place-items-center rounded-full border border-line-strong bg-surface font-mono text-xs text-ink tabular shadow-xs"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 rounded-xl border border-line bg-surface p-5 shadow-xs">
            <h3 className="font-sans text-base font-semibold tracking-normal text-ink">
              {step.title}
            </h3>
            <p className="mt-1.5 max-w-prose text-[15px] leading-7 text-ink-2">
              {step.body}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {step.links.map((link, linkIndex) => (
                <Button
                  key={link.to}
                  asChild
                  size="sm"
                  variant={linkIndex === 0 ? "outline" : "ghost"}
                >
                  <Link to={link.to}>
                    {link.label}
                    <ArrowRight aria-hidden="true" strokeWidth={1.75} />
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
