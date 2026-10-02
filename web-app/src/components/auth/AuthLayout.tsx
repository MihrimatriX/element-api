import type { ReactNode } from "react";

interface AuthLayoutProps {
  /** Page h1. */
  title: ReactNode;
  lead?: ReactNode;
  /** The form (or state) inside the panel. */
  children: ReactNode;
  /** Links under the panel: switch between sign-in, sign-up and recovery. */
  footer?: ReactNode;
}

/** Centred single-panel frame for the sign-in, sign-up and recovery pages. Renders the page's h1. */
export function AuthLayout({ title, lead, children, footer }: AuthLayoutProps) {
  return (
    <main className="container-page pb-24 pt-10 lg:pt-16">
      <div className="mx-auto w-full max-w-[27rem]">
        <div className="flex flex-col items-center text-center">
          <span className="grid size-12 place-items-center rounded-xl border border-line-strong bg-surface shadow-sm">
            <img
              src="/brand/mark-light.svg"
              alt=""
              width={24}
              height={24}
              className="size-6"
            />
          </span>
          <p className="eyebrow mt-6">Hesap</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {title}
          </h1>
          {lead && (
            <p className="mt-3 text-[15px] leading-7 text-ink-2">{lead}</p>
          )}
        </div>
        <div className="panel mt-8 p-5 shadow-md sm:p-7">{children}</div>
        {footer && (
          <div className="mt-6 grid gap-2 text-center text-sm leading-6 text-ink-3">
            {footer}
          </div>
        )}
      </div>
    </main>
  );
}
