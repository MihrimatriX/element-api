import type { ReactNode } from "react";
import type { Geometry, GeometryKind } from "../services/chemistry";

function Node({ x, y, r = 5 }: { x: number; y: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill="currentColor" />;
}
function Bond({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="currentColor"
      strokeWidth="1.8"
    />
  );
}

const SHAPE: Record<GeometryKind, ReactNode> = {
  linear: (
    <>
      <Bond x1={14} y1={28} x2={66} y2={28} />
      <Node x={14} y={28} />
      <Node x={40} y={28} r={7} />
      <Node x={66} y={28} />
    </>
  ),
  bent: (
    <>
      <Bond x1={16} y1={44} x2={40} y2={14} />
      <Bond x1={40} y1={14} x2={64} y2={44} />
      <Node x={16} y={44} />
      <Node x={40} y={14} r={7} />
      <Node x={64} y={44} />
    </>
  ),
  trigonal_planar: (
    <>
      <Bond x1={40} y1={28} x2={40} y2={8} />
      <Bond x1={40} y1={28} x2={16} y2={44} />
      <Bond x1={40} y1={28} x2={64} y2={44} />
      <Node x={40} y={28} r={7} />
      <Node x={40} y={8} />
      <Node x={16} y={44} />
      <Node x={64} y={44} />
    </>
  ),
  trigonal_pyramidal: (
    <>
      <Bond x1={40} y1={16} x2={16} y2={44} />
      <Bond x1={40} y1={16} x2={64} y2={44} />
      <Bond x1={40} y1={16} x2={40} y2={48} />
      <Node x={40} y={16} r={7} />
      <Node x={16} y={44} />
      <Node x={64} y={44} />
      <Node x={40} y={48} />
    </>
  ),
  tetrahedral: (
    <>
      <Bond x1={40} y1={10} x2={16} y2={42} />
      <Bond x1={40} y1={10} x2={64} y2={42} />
      <Bond x1={16} y1={42} x2={40} y2={36} />
      <Bond x1={64} y1={42} x2={40} y2={36} />
      <Node x={40} y={10} r={7} />
      <Node x={16} y={42} />
      <Node x={64} y={42} />
      <Node x={40} y={36} />
    </>
  ),
  trigonal_bipyramidal: (
    <>
      <Bond x1={40} y1={8} x2={40} y2={48} />
      <Bond x1={16} y1={28} x2={64} y2={28} />
      <Bond x1={40} y1={28} x2={24} y2={44} />
      <Bond x1={40} y1={28} x2={56} y2={44} />
      <Node x={40} y={28} r={7} />
      <Node x={40} y={8} />
      <Node x={40} y={48} />
      <Node x={16} y={28} />
      <Node x={64} y={28} />
    </>
  ),
  octahedral: (
    <>
      <Bond x1={40} y1={8} x2={40} y2={48} />
      <Bond x1={14} y1={28} x2={66} y2={28} />
      <Bond x1={24} y1={16} x2={56} y2={40} />
      <Node x={40} y={28} r={7} />
      <Node x={40} y={8} />
      <Node x={40} y={48} />
      <Node x={14} y={28} />
      <Node x={66} y={28} />
      <Node x={24} y={16} />
      <Node x={56} y={40} />
    </>
  ),
  network: (
    <>
      <Bond x1={18} y1={16} x2={40} y2={8} />
      <Bond x1={40} y1={8} x2={62} y2={16} />
      <Bond x1={18} y1={16} x2={18} y2={40} />
      <Bond x1={62} y1={16} x2={62} y2={40} />
      <Bond x1={18} y1={40} x2={40} y2={48} />
      <Bond x1={62} y1={40} x2={40} y2={48} />
      <Bond x1={40} y1={8} x2={40} y2={48} />
      <Node x={18} y={16} />
      <Node x={40} y={8} r={6} />
      <Node x={62} y={16} />
      <Node x={18} y={40} />
      <Node x={40} y={48} r={6} />
      <Node x={62} y={40} />
    </>
  ),
  ionic_lattice: (
    <>
      <rect
        x={12}
        y={10}
        width={24}
        height={16}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x={44}
        y={10}
        width={24}
        height={16}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x={12}
        y={30}
        width={24}
        height={16}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x={44}
        y={30}
        width={24}
        height={16}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <Node x={24} y={18} r={4} />
      <Node x={56} y={18} r={4} />
      <Node x={24} y={38} r={4} />
      <Node x={56} y={38} r={4} />
    </>
  ),
  molecular: (
    <>
      <Bond x1={22} y1={30} x2={40} y2={18} />
      <Bond x1={40} y1={18} x2={60} y2={34} />
      <Node x={22} y={30} />
      <Node x={40} y={18} r={7} />
      <Node x={60} y={34} />
    </>
  ),
};

export default function GeometryFigure({
  geometry,
  compact = false,
}: {
  geometry: Geometry;
  compact?: boolean;
}) {
  return (
    <figure className={`geometry-figure ${compact ? "is-compact" : ""}`}>
      <svg viewBox="0 0 80 56" role="img" aria-label={geometry.nameTr}>
        {SHAPE[geometry.id]}
      </svg>
      <figcaption>
        <strong>{geometry.nameTr}</strong>
        <span>{geometry.note}</span>
      </figcaption>
    </figure>
  );
}
