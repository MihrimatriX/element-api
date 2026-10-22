import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/ui/disclosure";
import { splitGuideTitle, type GuideNavGroup, type GuidePage } from "./guide-model";

interface GuideNavProps {
  overview: GuidePage | undefined;
  groups: readonly GuideNavGroup[];
  /** Page on screen; undefined for an unknown slug. */
  current: GuidePage | undefined;
}

const OVERVIEW_LABEL = "Genel bakış";

const itemClass =
  "focus-ring relative block rounded-md px-3 py-1.5 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-surface-2 aria-[current=page]:font-medium aria-[current=page]:text-ink before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full aria-[current=page]:before:bg-brand-ink";

/** Sidebar link; the current page also lists its sections as in-page links. */
function NavItem({ page, label, isCurrent }: { page: GuidePage; label: string; isCurrent: boolean }) {
  return (
    <li>
      <Link to={page.path} aria-current={isCurrent ? "page" : undefined} className={itemClass}>
        {label}
      </Link>
      {isCurrent && (
        <ul className="mt-1 mb-2 ml-3 border-l border-line">
          {page.sections.map((section) => (
            <li key={section.anchor}>
              <Link
                to={{ hash: section.anchor }}
                className="focus-ring -ml-px block border-l border-transparent py-1 pl-3.5 text-[13px] text-ink-3 transition-colors hover:border-ink-3 hover:text-ink"
              >
                {section.heading}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Desktop sidebar: overview link, then the service pages in their groups. */
export function GuideNav({ overview, groups, current }: GuideNavProps) {
  return (
    <nav aria-label="Kılavuz bölümleri" className="text-[14px]">
      {overview && (
        <ul>
          <NavItem page={overview} label={OVERVIEW_LABEL} isCurrent={overview === current} />
        </ul>
      )}
      {groups.map((group) => (
        <div key={group.label} className="mt-6">
          <p className="eyebrow mb-2 pl-3">{group.label}</p>
          <ul className="space-y-0.5">
            {group.pages.map((page) => (
              <NavItem
                key={page.slug}
                page={page}
                label={splitGuideTitle(page.title).name}
                isCurrent={page === current}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// Same height, fill and hairline as the search field beside it in the toolbar.
const pickerTriggerClass =
  "h-10 border border-line-strong bg-canvas-2 px-3 py-0 text-base font-normal shadow-xs transition-[border-color] duration-150 hover:border-ink-4 data-[state=open]:border-brand-ink md:text-[15px]";

/**
 * Phone and tablet navigation: a button naming the current page opens the
 * sidebar's list of links. Only following a link navigates, so arrowing through
 * the list never changes the page (a select that navigated on change did).
 * Any navigation closes the list at once, before the page scrolls to its anchor;
 * a followed link hands focus to the button instead of dropping it with the list.
 * Its two parts are items of GuideLayout's toolbar grid: the button, and the
 * list, which spans both columns below it.
 */
export function GuidePicker({ overview, groups, current }: GuideNavProps) {
  const { key } = useLocation();
  // Open only at the location it was opened at, so every navigation closes it.
  const [openAt, setOpenAt] = useState<string>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  let currentLabel = "Bölüm seç";
  if (current && current === overview) currentLabel = OVERVIEW_LABEL;
  else if (current) currentLabel = splitGuideTitle(current.title).name;

  function handleListClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("a")) triggerRef.current?.focus();
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    setOpenAt(undefined);
    triggerRef.current?.focus();
  }

  return (
    <Disclosure
      open={openAt === key}
      onOpenChange={(open) => setOpenAt(open ? key : undefined)}
      className="contents"
    >
      <DisclosureTrigger ref={triggerRef} className={pickerTriggerClass}>
        <span>
          <span className="sr-only">Kılavuz bölümü: </span>
          {currentLabel}
        </span>
      </DisclosureTrigger>
      <DisclosureContent
        onClick={handleListClick}
        onKeyDown={handleListKeyDown}
        className="data-[state=closed]:animate-none sm:order-last sm:col-span-2"
      >
        <div className="panel p-3">
          <GuideNav overview={overview} groups={groups} current={current} />
        </div>
      </DisclosureContent>
    </Disclosure>
  );
}
