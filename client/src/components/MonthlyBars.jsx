import { useEffect, useRef, useState } from "react";

// Grouped bar chart: income vs expenses per month. Two series, so it ships a
// legend + hover tooltip (identity is never color-alone). Colors validated for
// CVD + contrast on the dark surface. Single € axis anchored at zero.
const SERIES = [
  { key: "income", name: "Income", color: "#3987e5" },
  { key: "expenses", name: "Expenses", color: "#d95926" },
];

export default function MonthlyBars({ data, format }) {
  const wrapRef = useRef(null);
  const [w, setW] = useState(320);
  const [hover, setHover] = useState(null);
  const h = 220;
  const pad = { top: 12, right: 12, bottom: 24, left: 44 };

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  if (!data || data.length === 0)
    return <div className="muted small">No data yet.</div>;

  const innerW = Math.max(w - pad.left - pad.right, 10);
  const innerH = h - pad.top - pad.bottom;

  const max =
    Math.max(1, ...data.flatMap((d) => SERIES.map((s) => d[s.key] || 0))) * 1.1;

  const groupW = innerW / data.length;
  const barGap = 2;
  const barW = Math.max((groupW * 0.7 - barGap) / SERIES.length, 3);
  const y = (v) => pad.top + innerH - (v / max) * innerH;

  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => (max * i) / ticks);

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - pad.left;
    const idx = Math.floor(px / groupW);
    setHover(idx >= 0 && idx < data.length ? idx : null);
  }

  return (
    <div className="chart" ref={wrapRef}>
      <div className="legend">
        {SERIES.map((s) => (
          <span key={s.key} className="legend-item">
            <span className="swatch" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>

      <svg
        width={w}
        height={h}
        role="img"
        aria-label="Monthly income and expenses"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {gridVals.map((v, i) => (
          <g key={i}>
            <line
              x1={pad.left} x2={w - pad.right} y1={y(v)} y2={y(v)}
              stroke="rgba(148,163,184,0.15)" strokeWidth="1"
            />
            <text x={pad.left - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              {compact(v)}
            </text>
          </g>
        ))}

        {data.map((d, gi) => {
          const gx = pad.left + gi * groupW + groupW * 0.15;
          const active = hover === gi;
          return (
            <g key={gi} opacity={hover == null || active ? 1 : 0.5}>
              {SERIES.map((s, si) => {
                const v = d[s.key] || 0;
                const bx = gx + si * (barW + barGap);
                const by = y(v);
                return (
                  <rect
                    key={s.key}
                    x={bx} y={by} width={barW} height={Math.max(pad.top + innerH - by, 0)}
                    rx="3" fill={s.color}
                  />
                );
              })}
              <text
                x={pad.left + gi * groupW + groupW / 2} y={h - 6}
                textAnchor="middle" fontSize="9" fill="#94a3b8"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hover != null && (
        <div className="chart-tip col">
          <strong>{data[hover].label}</strong>
          {SERIES.map((s) => (
            <span key={s.key}>
              <span className="swatch" style={{ background: s.color }} />
              {s.name}: {format ? format(data[hover][s.key] || 0) : data[hover][s.key]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function compact(n) {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(n / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return Math.round(n).toString();
}
