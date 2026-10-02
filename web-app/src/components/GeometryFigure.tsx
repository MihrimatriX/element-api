import { useId, type ReactNode } from "react";
import type { Geometry, GeometryKind } from "../services/chemistry";
import { cn } from "@/lib/utils";

/** Atom dot: the central atom in cuprite, surrounding atoms in light ink. */
function Atom({ x, y, center = false }: { x: number; y: number; center?: boolean }) {
  return (
    <circle
      cx={x}
      cy={y}
      r={center ? 6.5 : 4.5}
      className={center ? "fill-brand-ink" : "fill-ink-2"}
    />
  );
}

function Bond({ from, to }: { from: [number, number]; to: [number, number] }) {
  return (
    <line
      x1={from[0]}
      y1={from[1]}
      x2={to[0]}
      y2={to[1]}
      strokeWidth="1.6"
      strokeLinecap="round"
      className="stroke-ink-3"
    />
  );
}

/** Lattice cell outline for the ionic sketch. */
function Cell({ x, y }: { x: number; y: number }) {
  return (
    <rect
      x={x}
      y={y}
      width={24}
      height={16}
      rx={1.5}
      fill="none"
      strokeWidth="1.4"
      className="stroke-ink-4"
    />
  );
}

/** Schematic per geometry class, drawn on an 80×56 grid (not to scale). */
const SHAPE: Record<GeometryKind, ReactNode> = {
  linear: (
    <>
      <Bond from={[14, 28]} to={[66, 28]} />
      <Atom x={14} y={28} />
      <Atom x={40} y={28} center />
      <Atom x={66} y={28} />
    </>
  ),
  bent: (
    <>
      <Bond from={[16, 44]} to={[40, 14]} />
      <Bond from={[40, 14]} to={[64, 44]} />
      <Atom x={16} y={44} />
      <Atom x={40} y={14} center />
      <Atom x={64} y={44} />
    </>
  ),
  trigonal_planar: (
    <>
      <Bond from={[40, 28]} to={[40, 8]} />
      <Bond from={[40, 28]} to={[16, 44]} />
      <Bond from={[40, 28]} to={[64, 44]} />
      <Atom x={40} y={28} center />
      <Atom x={40} y={8} />
      <Atom x={16} y={44} />
      <Atom x={64} y={44} />
    </>
  ),
  trigonal_pyramidal: (
    <>
      <Bond from={[40, 16]} to={[16, 44]} />
      <Bond from={[40, 16]} to={[64, 44]} />
      <Bond from={[40, 16]} to={[40, 48]} />
      <Atom x={40} y={16} center />
      <Atom x={16} y={44} />
      <Atom x={64} y={44} />
      <Atom x={40} y={48} />
    </>
  ),
  tetrahedral: (
    <>
      <Bond from={[40, 10]} to={[16, 42]} />
      <Bond from={[40, 10]} to={[64, 42]} />
      <Bond from={[16, 42]} to={[40, 36]} />
      <Bond from={[64, 42]} to={[40, 36]} />
      <Atom x={40} y={10} center />
      <Atom x={16} y={42} />
      <Atom x={64} y={42} />
      <Atom x={40} y={36} />
    </>
  ),
  trigonal_bipyramidal: (
    <>
      <Bond from={[40, 8]} to={[40, 48]} />
      <Bond from={[16, 28]} to={[64, 28]} />
      <Bond from={[40, 28]} to={[24, 44]} />
      <Bond from={[40, 28]} to={[56, 44]} />
      <Atom x={40} y={28} center />
      <Atom x={40} y={8} />
      <Atom x={40} y={48} />
      <Atom x={16} y={28} />
      <Atom x={64} y={28} />
    </>
  ),
  octahedral: (
    <>
      <Bond from={[40, 8]} to={[40, 48]} />
      <Bond from={[14, 28]} to={[66, 28]} />
      <Bond from={[24, 16]} to={[56, 40]} />
      <Atom x={40} y={28} center />
      <Atom x={40} y={8} />
      <Atom x={40} y={48} />
      <Atom x={14} y={28} />
      <Atom x={66} y={28} />
      <Atom x={24} y={16} />
      <Atom x={56} y={40} />
    </>
  ),
  network: (
    <>
      <Bond from={[18, 16]} to={[40, 8]} />
      <Bond from={[40, 8]} to={[62, 16]} />
      <Bond from={[18, 16]} to={[18, 40]} />
      <Bond from={[62, 16]} to={[62, 40]} />
      <Bond from={[18, 40]} to={[40, 48]} />
      <Bond from={[62, 40]} to={[40, 48]} />
      <Bond from={[40, 8]} to={[40, 48]} />
      <Atom x={18} y={16} />
      <Atom x={40} y={8} center />
      <Atom x={62} y={16} />
      <Atom x={18} y={40} />
      <Atom x={40} y={48} center />
      <Atom x={62} y={40} />
    </>
  ),
  ionic_lattice: (
    <>
      <Cell x={12} y={10} />
      <Cell x={44} y={10} />
      <Cell x={12} y={30} />
      <Cell x={44} y={30} />
      <Atom x={24} y={18} center />
      <Atom x={56} y={18} />
      <Atom x={24} y={38} />
      <Atom x={56} y={38} center />
    </>
  ),
  molecular: (
    <>
      <Bond from={[22, 30]} to={[40, 18]} />
      <Bond from={[40, 18]} to={[60, 34]} />
      <Atom x={22} y={30} />
      <Atom x={40} y={18} center />
      <Atom x={60} y={34} />
    </>
  ),
};

/**
 * Small schematic of a compound's geometry class (VSEPR shape or lattice) with
 * its Turkish name and a one-line note. `compact` is the inline size used in
 * lab results and the glossary.
 */
export default function GeometryFigure({
  geometry,
  compact = false,
  className,
}: {
  geometry: Geometry;
  compact?: boolean;
  className?: string;
}) {
  const noteId = useId();
  return (
    <figure
      className={cn(
        "flex items-center gap-4",
        compact ? "gap-3" : "rounded-xl border border-line bg-canvas-2/60 p-4 sm:gap-5",
        className,
      )}
    >
      <svg
        viewBox="0 0 80 56"
        role="img"
        aria-label={geometry.nameTr}
        aria-describedby={noteId}
        className={cn(
          "shrink-0",
          compact
            ? "h-11 w-16"
            : "h-20 w-28 rounded-lg border border-line bg-surface p-2",
        )}
      >
        {SHAPE[geometry.id]}
      </svg>
      <figcaption className="min-w-0">
        <strong
          className={cn("block font-semibold text-ink", compact ? "text-sm" : "text-base")}
        >
          {geometry.nameTr}
        </strong>
        <span id={noteId} className="mt-0.5 block text-[13px] leading-5 text-ink-2">
          {geometry.note}
        </span>
      </figcaption>
    </figure>
  );
}
