import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

/**
 * Class strings and tone styles shared by several primitives. Kept out of the component files so
 * those files export components only (fast refresh).
 */

/**
 * Text-entry controls (Input, Textarea, NativeSelect, SearchField): recessed canvas
 * fill, strong hairline, cuprite focus ring, danger state via aria-invalid.
 * 16px text below `md` stops iOS from zooming into focused fields.
 */
export const controlClass =
  "w-full min-w-0 rounded-md border border-line-strong bg-canvas-2 text-base text-ink shadow-xs outline-none transition-[color,background-color,border-color,box-shadow] duration-150 placeholder:text-ink-4 hover:border-ink-4 focus-visible:border-brand-ink focus-visible:ring-3 focus-visible:ring-brand-soft disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:focus-visible:ring-danger-soft md:text-[15px]";

/** Dimmed backdrop behind Dialog, Sheet and ConfirmDialog. */
export const overlayClass =
  "fixed inset-0 z-(--z-overlay) bg-canvas/75 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0";

/** Centred modal panel (Dialog, ConfirmDialog). */
export const modalPanelClass =
  "fixed top-1/2 left-1/2 z-(--z-overlay) grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-xl border border-line-strong bg-surface p-6 shadow-lg outline-none duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-97 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-97 sm:max-w-lg";

/** Square close button in the corner of an overlay. */
export const overlayCloseClass =
  "focus-ring absolute top-3.5 right-3.5 grid size-8 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink";

/** Modal title: display face, one step below a section heading. */
export const modalTitleClass =
  "font-display text-xl leading-tight font-semibold tracking-tight text-ink";

/** Status tones shared by Notice and Toaster. */
export type Tone = "info" | "success" | "warning" | "danger" | "neutral";

/** Per tone: soft box (border + fill), icon colour and icon. */
export const toneStyles: Record<
  Tone,
  { box: string; icon: string; Icon: LucideIcon }
> = {
  info: { box: "border-info/25 bg-info-soft", icon: "text-info", Icon: Info },
  success: {
    box: "border-success/25 bg-success-soft",
    icon: "text-success",
    Icon: CircleCheck,
  },
  warning: {
    box: "border-warning/25 bg-warning-soft",
    icon: "text-warning",
    Icon: TriangleAlert,
  },
  danger: {
    box: "border-danger/30 bg-danger-soft",
    icon: "text-danger",
    Icon: CircleAlert,
  },
  neutral: { box: "border-line bg-surface", icon: "text-ink-3", Icon: Info },
};
