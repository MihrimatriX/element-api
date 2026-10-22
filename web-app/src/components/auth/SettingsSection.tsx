import { useId, type ReactNode } from "react";

interface SettingsSectionProps {
  /** Section h2. */
  title: ReactNode;
  description?: ReactNode;
  /** The section's panel: a form, a status card or a link. */
  children: ReactNode;
}

/** One settings row: heading and explanation on the left, the controls on the right from `lg`. */
export function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="grid gap-5 py-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12 lg:py-10"
    >
      <div>
        <h2
          id={headingId}
          className="font-sans text-base font-semibold tracking-normal text-ink"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm leading-6 text-ink-3">{description}</p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
