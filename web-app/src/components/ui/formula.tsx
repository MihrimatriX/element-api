import { formulaParts } from "@/lib/formula";
import { cn } from "@/lib/utils";

interface FormulaProps {
  /** Plain formula: "H2O", "Ca(OH)2", "CuSO4·5H2O"; "SO4^2-" carries a charge. */
  value: string;
  /** Ionic charge ("2-", "+"); same as writing `^charge` in `value`. */
  charge?: string;
  className?: string;
}

/** Chemical formula in mono with atom counts as subscripts and the charge as superscript. */
export function Formula({ value, charge, className }: FormulaProps) {
  const parts = formulaParts(charge ? `${value}^${charge}` : value);
  return (
    <span className={cn("font-mono whitespace-nowrap", className)}>
      {parts.map((part, index) => {
        if (part.kind === "sub") return <sub key={index}>{part.text}</sub>;
        if (part.kind === "sup") return <sup key={index}>{part.text}</sup>;
        return <span key={index}>{part.text}</span>;
      })}
    </span>
  );
}
