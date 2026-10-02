import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { toast } from "./toast";

interface CopyButtonProps {
  /** Text placed on the clipboard. */
  value: string;
  /** Accessible name (and visible text with `showLabel`). Default "Kopyala". */
  label?: string;
  /** Show the label next to the icon. */
  showLabel?: boolean;
  className?: string;
}

const COPIED_MS = 1600;

/** Copies `value` to the clipboard; the icon turns into a check and the result is announced. */
export function CopyButton({
  value,
  label = "Kopyala",
  showLabel = false,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      toast("Kopyalanamadı", {
        tone: "danger",
        description: "Tarayıcı panoya erişime izin vermedi.",
      });
    }
  }

  const Icon = copied ? Check : Copy;
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={showLabel ? "sm" : "icon-sm"}
        onClick={copy}
        className={cn(copied && "text-success hover:text-success", className)}
      >
        <Icon aria-hidden="true" strokeWidth={1.75} />
        <span className={showLabel ? undefined : "sr-only"}>
          {showLabel && copied ? "Kopyalandı" : label}
        </span>
      </Button>
      <span role="status" className="sr-only">
        {copied ? "Panoya kopyalandı" : ""}
      </span>
    </>
  );
}
