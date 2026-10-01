import { useState, type MouseEvent, type ReactElement, type ReactNode } from "react";
import { AlertDialog } from "radix-ui";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { modalPanelClass, modalTitleClass, overlayClass } from "./classes";

interface ConfirmDialogProps {
  title: ReactNode;
  description?: ReactNode;
  /** Extra content between description and buttons (e.g. a typed confirmation Field). */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` (default) for destructive actions, `default` for neutral confirmations. */
  tone?: "danger" | "default";
  /** Runs on confirm. Return a promise to keep the dialog open with a spinner until it settles; a rejection keeps it open. */
  onConfirm: () => void | Promise<void>;
  /** Disables the confirm button (e.g. until the typed confirmation matches). */
  confirmDisabled?: boolean;
  /** Element that opens the dialog (uncontrolled use). */
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Are-you-sure dialog (role="alertdialog"): focus starts on Cancel, Escape cancels, outside clicks are ignored. */
export function ConfirmDialog({
  title,
  description,
  children,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  tone = "danger",
  onConfirm,
  confirmDisabled = false,
  trigger,
  open,
  onOpenChange,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const isOpen = open ?? internalOpen;

  function setOpen(next: boolean) {
    setInternalOpen(next);
    onOpenChange?.(next);
  }

  function confirm(event: MouseEvent<HTMLButtonElement>) {
    const result = onConfirm();
    if (!(result instanceof Promise)) return;
    event.preventDefault();
    setBusy(true);
    result
      .then(() => setOpen(false))
      .catch(() => undefined)
      .finally(() => setBusy(false));
  }

  return (
    <AlertDialog.Root open={isOpen} onOpenChange={setOpen}>
      {trigger && <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>}
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={overlayClass} />
        <AlertDialog.Content className={cn(modalPanelClass, "sm:max-w-md")}>
          <div className="grid gap-2">
            <AlertDialog.Title className={modalTitleClass}>{title}</AlertDialog.Title>
            {description && (
              <AlertDialog.Description className="text-sm leading-6 text-ink-2">
                {description}
              </AlertDialog.Description>
            )}
          </div>
          {children}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={busy}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                variant={tone === "danger" ? "destructive" : "default"}
                disabled={confirmDisabled || busy}
                aria-busy={busy || undefined}
                onClick={confirm}
              >
                {busy && <LoaderCircle aria-hidden="true" className="animate-spin" />}
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
