import type { Point } from "@/lib/types";
import { routePath } from "@/lib/geo";

type Props = {
  points: Point[];
  className?: string;
  /** aspect ratio as width/height */
  ratio?: number;
  live?: boolean;
};

export default function RouteMap({ points, className = "", ratio = 1.6, live = false }: Props) {
  const w = 320;
  const h = Math.round(w / ratio);
  const d = routePath(points, w, h, 14);
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`block w-full ${className}`}
      role="img"
      aria-label={points.length > 1 ? "Route trace" : "No route yet"}
    >
      <rect width={w} height={h} className="fill-chalk" />
      {d ? (
        <>
          <path d={d} fill="none" className="stroke-lane" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {live && last && <LiveDot points={points} w={w} h={h} />}
        </>
      ) : (
        <text x={w / 2} y={h / 2} textAnchor="middle" className="fill-ink-soft text-[13px]">
          {live ? "Route will draw as you move" : "No route recorded"}
        </text>
      )}
    </svg>
  );
}

function LiveDot({ points, w, h }: { points: Point[]; w: number; h: number }) {
  // Recompute the last coordinate using the same fit as the path.
  const d = routePath(points, w, h, 14);
  const m = /L([\d.]+) ([\d.]+)$/.exec(d);
  if (!m) return null;
  return <circle cx={m[1]} cy={m[2]} r="5" className="fill-ink fix-pulse" />;
}
