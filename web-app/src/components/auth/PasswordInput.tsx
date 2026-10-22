import { useState, type ComponentProps, type KeyboardEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFieldControl } from "@/components/ui/field-context";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Password `Input` with a show/hide toggle and a Caps Lock warning.
 * Inside a `Field` it picks up id, description and invalid state like `Input`.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const { id } = useFieldControl();
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  function readCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"));
  }

  return (
    <div className="grid gap-1.5">
      <div className="relative">
        <Input
          {...props}
          type={visible ? "text" : "password"}
          className={cn("pr-11", className)}
          onKeyDown={readCapsLock}
          onKeyUp={readCapsLock}
          onBlur={() => setCapsLock(false)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Şifreyi göster"
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible((shown) => !shown)}
          className="absolute top-1 right-1 text-ink-3"
        >
          {visible ? <EyeOff strokeWidth={1.75} /> : <Eye strokeWidth={1.75} />}
        </Button>
      </div>
      {capsLock && (
        <p className="text-[13px] leading-5 text-warning">Caps Lock açık.</p>
      )}
    </div>
  );
}
