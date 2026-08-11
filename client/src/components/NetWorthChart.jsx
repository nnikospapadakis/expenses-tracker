import { useEffect, useRef, useState } from "react";

// Single-series net-worth line chart. Dark-surface only (matches the app).
// Follows the data-viz mark specs: 2px non-scaling line, low-opacity area fill,
// recessive grid, a direct label on the final point, and a hover crosshair
// + tooltip (pointer events, so it also works with touch).
export default function NetWorthChart({ data, format }) {
  const wrapRef = useRef(null);
  const [w, setW] = useState(320);
  const [hover, setHover] = useState(null); // index under the cursor
  const h = 240;
  const pad = { top: 16, right: 16, bottom: 24, left: 48 };

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  if (!data || data.length === 0)
    return <div className="muted small">No data to project.</div>;

  const innerW = Math.max(w - pad.left - pad.right, 10);
  const innerH = h - pad.top - pad.bottom;

  const values = data.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padAmt = (rawMax - rawMin) * 0.08 || Math.abs(rawMax) * 0.1 || 1;
  // Non-zero baseline for an all-positive series (so the trend fills the space);
  // when the series dips to/below zero, keep zero in view with the dashed line.
  const min = rawMin < 0 ? rawMin - padAmt : Math.max(0, rawMin - padAmt);
  const max = rawMax + padAmt;
  const span = max - min || 1;

  const x = (i) => pad.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - ((v - min) / span) * innerH;

  const linePath = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join(" ");
  const areaPath =
    `${linePath} L${x(data.length - 1)},${y(min)} L${x(0)},${y(min)} Z`;

  // Horizontal gridlines at ~4 steps.
  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => min + (span * i) / ticks);

  const last = data[data.length - 1];
  const zeroY = y(0);

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let nearest = 0, best = Infinity;
    for (let i = 0; i < data.length; i++) {
      const d = Math.abs(x(i) - px);
      if (d < best) { best = d; nearest = i; }
    }
    setHover(nearest);
  }

  const hv = hover != null ? data[hover] : null;

  return (
    <div className="chart" ref={wrapRef}>
      <svg
        width={w}
        height={h}
        role="img"
        aria-label="Projected net worth over time"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* gridlines + y labels */}
        {gridVals.map((v, i) => (
          <g key={i}>
            <line
              x1={pad.left} x2={w - pad.right} y1={y(v)} y2={y(v)}
              stroke="rgba(148,163,184,0.15)" strokeWidth="1"
            />
            <text
              x={pad.left - 8} y={y(v) + 4} textAnchor="end"
              fontSize="10" fill="#94a3b8"
            >
              {compact(v)}
            </text>
          </g>
        ))}

        {/* zero baseline (only if inside the visible range) */}
        {min < 0 && (
          <line
            x1={pad.left} x2={w - pad.right} y1={zeroY} y2={zeroY}
            stroke="rgba(226,232,240,0.35)" strokeWidth="1" strokeDasharray="3 3"
          />
        )}

        {/* area + line */}
        <path d={areaPath} fill="url(#nwFill)" />
        <path
          d={linePath} fill="none" stroke="#38bdf8" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* x labels: first, middle, last to avoid crowding */}
        {[0, Math.floor((data.length - 1) / 2), data.length - 1]
          .filter((v, i, a) => a.indexOf(v) === i)
          .map((i) => (
            <text
              key={i} x={x(i)} y={h - 6} textAnchor="middle"
              fontSize="10" fill="#94a3b8"
            >
              {data[i].label}
            </text>
          ))}

        {/* final-point marker + direct label */}
        <circle cx={x(data.length - 1)} cy={y(last.value)} r="4" fill="#38bdf8" />
        <text
          x={x(data.length - 1)} y={y(last.value) - 10} textAnchor="end"
          fontSize="12" fontWeight="700" fill="#e2e8f0"
        >
          {compact(last.value)}
        </text>

        {/* hover crosshair + marker */}
        {hv && (
          <g>
            <line
              x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + innerH}
              stroke="rgba(226,232,240,0.4)" strokeWidth="1"
            />
            <circle
              cx={x(hover)} cy={y(hv.value)} r="5"
              fill="#0f172a" stroke="#38bdf8" strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {hv && (
        <div className="chart-tip">
          <strong>{hv.label}</strong>
          <span>{format ? format(hv.value) : hv.value}</span>
        </div>
      )}
    </div>
  );
}

// Compact currency-ish label for axis ticks (e.g. 12.5k).
function compact(n) {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(n / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return Math.round(n).toString();
}
