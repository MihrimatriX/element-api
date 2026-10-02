import { useId } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
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

/** Phone and tablet navigation: the same pages in a native select (optgroups per group). */
export function GuidePicker({ overview, groups, current }: GuideNavProps) {
  const navigate = useNavigate();
  const selectId = useId();
  return (
    <div>
      <label htmlFor={selectId} className="sr-only">
        Kılavuz bölümü
      </label>
      <NativeSelect
        id={selectId}
        value={current?.path ?? ""}
        onChange={(event) => navigate(event.target.value)}
      >
        {!current && <NativeSelectOption value="">Bölüm seç</NativeSelectOption>}
        {overview && <NativeSelectOption value={overview.path}>{OVERVIEW_LABEL}</NativeSelectOption>}
        {groups.map((group) => (
          <NativeSelectOptGroup key={group.label} label={group.label}>
            {group.pages.map((page) => (
              <NativeSelectOption key={page.slug} value={page.path}>
                {splitGuideTitle(page.title).name}
              </NativeSelectOption>
            ))}
          </NativeSelectOptGroup>
        ))}
      </NativeSelect>
    </div>
  );
}
