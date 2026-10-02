import { cn } from "@/lib/utils";

interface ShellDiagramProps {
  symbol: string;
  /** Electrons per shell, innermost first (e.g. iron: 2, 8, 14, 2). Empty while loading. */
  shells?: readonly number[];
  className?: string;
}

const CENTER = 110;

/**
 * Bohr-style schematic: nucleus with the symbol and one ring of electrons per shell.
 * Not to scale. Colours come from the `--family` custom property of an ancestor.
 */
export function ShellDiagram({ symbol, shells = [], className }: ShellDiagramProps) {
  const ringGap = 58 / Math.max(1, shells.length - 1);
  return (
    <svg
      viewBox="0 0 220 220"
      role="img"
      aria-label={`${symbol}, şematik elektron kabukları: ${shells.join(", ") || "veri yok"}`}
      className={cn("text-ink", className)}
    >
      {shells.map((electrons, shell) => {
        const radius = 38 + shell * ringGap;
        return (
          <g key={shell}>
            <circle
              cx={CENTER}
              cy={CENTER}
              r={radius}
              className="fill-none stroke-line-strong"
            />
            {Array.from({ length: electrons }, (_, index) => {
              const angle = (index / electrons) * Math.PI * 2 + shell * 0.4;
              return (
                <circle
                  key={index}
                  cx={CENTER + radius * Math.cos(angle)}
                  cy={CENTER + radius * Math.sin(angle)}
                  r={electrons > 20 ? 2 : 2.8}
                  className="fill-(--family)"
                />
              );
            })}
          </g>
        );
      })}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={24}
        className="fill-[color-mix(in_oklch,var(--family)_22%,var(--color-surface-2))] stroke-(--family)"
      />
      <text
        x={CENTER}
        y={CENTER}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-current font-mono text-[17px] font-semibold"
      >
        {symbol}
      </text>
    </svg>
  );
}
