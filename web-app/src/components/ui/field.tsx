import { useId, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldContext } from "./field-context";

interface FieldProps {
  label: ReactNode;
  /** Help text under the control. */
  hint?: ReactNode;
  /** Error message; marks the control invalid. */
  error?: ReactNode;
  required?: boolean;
  /** Small link or action on the label row ("Şifremi unuttum"). */
  labelAction?: ReactNode;
  /** One `Input`, `Textarea` or `NativeSelect`; it receives id and aria attributes. */
  children: ReactNode;
  className?: string;
}

/**
 * Form row: label, control, hint and error with ids wired up
 * (`htmlFor`, `aria-describedby`, `aria-invalid`).
 */
export function Field({
  label,
  hint,
  error,
  required = false,
  labelAction,
  children,
  className,
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-brand-ink">
              *
            </span>
          )}
        </label>
        {labelAction && <div className="text-[13px]">{labelAction}</div>}
      </div>
      <FieldContext.Provider
        value={{
          id,
          "aria-describedby": describedBy || undefined,
          "aria-invalid": error ? true : undefined,
          required: required || undefined,
        }}
      >
        {children}
      </FieldContext.Provider>
      {hint && (
        <p id={hintId} className="text-[13px] leading-5 text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="flex items-start gap-1.5 text-[13px] leading-5 text-danger"
        >
          <CircleAlert
            aria-hidden="true"
            strokeWidth={1.75}
            className="mt-0.5 size-3.5 shrink-0"
          />
          {error}
        </p>
      )}
    </div>
  );
}
