"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

/**
 * Small dependency-free SVG/HTML charts for the admin portal.
 * Categorical colours are fixed per entity (never by rank) and were checked for colour-blind separation
 * against the white card surface. Every chart also shows its values as text, so colour is never the only cue.
 */
export const SERIES = ["#6250d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"] as const;
const PREV = "#9AA0AE";

function useWidth<T extends HTMLElement>(initial = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/** Tiny trend line for a stat tile. Decorative: the tile states the number. */
export function Sparkline({ values, color = SERIES[0] }: { values: number[]; color?: string }) {
  const w = 96;
  const h = 32;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => `${((i / Math.max(values.length - 1, 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / (max - min || 1)) * (h - 4)).toFixed(1)}`);
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Line + area chart for one measure over time, with an optional dashed previous-period line.
 * Crosshair tooltip on hover/touch and arrow keys when focused; a hidden table carries the data for screen readers.
 */
export function TrendChart({
  labels,
  current,
  previous,
  format,
  axisFormat = format,
  currentLabel,
  previousLabel,
  title,
  height = 260,
}: {
  labels: string[];
  current: number[];
  previous?: number[];
  format: (v: number) => string;
  axisFormat?: (v: number) => string;
  currentLabel: string;
  previousLabel?: string;
  title: string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [idx, setIdx] = useState<number | null>(null);
  const padL = 56;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const iw = Math.max(width - padL - padR, 10);
  const ih = height - padT - padB;
  const max = niceMax(Math.max(...current, ...(previous ?? []), 0));
  const n = current.length;
  const x = (i: number) => padL + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => padT + ih - (v / max) * ih;
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${path(current)}L${x(n - 1).toFixed(1)},${padT + ih}L${x(0).toFixed(1)},${padT + ih}Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 90))));
  const gid = `tg-${title.replace(/\W/g, "")}`;

  const move = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - box.left) / box.width) * (n - 1));
    setIdx(Math.min(n - 1, Math.max(0, i)));
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setIdx((i) => Math.min(n - 1, Math.max(0, (i ?? n - 1) + (e.key === "ArrowRight" ? 1 : -1))));
    }
  };

  return (
    <div className="chart" ref={ref}>
      <div className="legend" aria-hidden="true">
        <span><i style={{ background: SERIES[0] }} />{currentLabel}</span>
        {previous && previousLabel && <span><i className="dash" style={{ borderColor: PREV }} />{previousLabel}</span>}
      </div>
      <div className="chart-plot" tabIndex={0} role="img" aria-label={title} onKeyDown={key} onBlur={() => setIdx(null)}>
        <svg width={width} height={height} aria-hidden="true">
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={SERIES[0]} stopOpacity=".18" />
              <stop offset="1" stopColor={SERIES[0]} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={padL + iw} y1={y(t)} y2={y(t)} className="grid-line" />
              <text x={padL - 8} y={y(t)} className="axis" textAnchor="end" dominantBaseline="middle">{axisFormat(t)}</text>
            </g>
          ))}
          {labels.map((l, i) => (i % step === 0 || i === n - 1) && (n - 1 - i >= step / 2 || i === n - 1) ? (
            <text key={i} x={x(i)} y={height - 8} className="axis" textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>{l}</text>
          ) : null)}
          <path d={area} fill={`url(#${gid})`} />
          {previous && <path d={path(previous)} fill="none" stroke={PREV} strokeWidth="1.5" strokeDasharray="4 4" />}
          <path d={path(current)} fill="none" stroke={SERIES[0]} strokeWidth="2" strokeLinejoin="round" />
          {idx !== null && (
            <g>
              <line x1={x(idx)} x2={x(idx)} y1={padT} y2={padT + ih} className="crosshair" />
              {previous && <circle cx={x(idx)} cy={y(previous[idx] ?? 0)} r="4" fill={PREV} stroke="#fff" strokeWidth="2" />}
              <circle cx={x(idx)} cy={y(current[idx] ?? 0)} r="5" fill={SERIES[0]} stroke="#fff" strokeWidth="2" />
            </g>
          )}
          <rect x={padL} y={padT} width={iw} height={ih} fill="transparent" onPointerMove={move} onPointerDown={move} onPointerLeave={() => setIdx(null)} />
        </svg>
        {idx !== null && (
          <div className="chart-tip" style={{ left: Math.min(Math.max(x(idx), 90), width - 90), top: padT }}>
            <b>{labels[idx]}</b>
            <span><i style={{ background: SERIES[0] }} />{currentLabel}: {format(current[idx] ?? 0)}</span>
            {previous && previousLabel && <span><i style={{ background: PREV }} />{previousLabel}: {format(previous[idx] ?? 0)}</span>}
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {labels.map((l, i) => (
            <tr key={i}><th scope="row">{l}</th><td>{format(current[i] ?? 0)}</td>{previous && <td>{format(previous[i] ?? 0)}</td>}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface ChartItem {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Formatted value shown next to the label. */
  display: string;
}

/** Horizontal bars, sorted by value, each labelled with its value. */
export function BarList({ items, title }: { items: ChartItem[]; title: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <ul className="barlist" aria-label={title}>
      {[...items].sort((a, b) => b.value - a.value).map((i) => (
        <li key={i.key} title={`${i.label}: ${i.display} (${Math.round((i.value / total) * 100)} %)`}>
          <div className="bl-row">
            <span className="bl-label"><i style={{ background: i.color }} />{i.label}</span>
            <span className="bl-val">{i.display}<small>{Math.round((i.value / total) * 100)} %</small></span>
          </div>
          <div className="bl-track"><div className="bl-bar" style={{ width: `${Math.max(1.5, (i.value / max) * 100)}%`, background: i.color }} /></div>
        </li>
      ))}
    </ul>
  );
}

/** Donut with a 2px surface gap between segments; hovering a segment or legend row shows it in the centre. */
export function Donut({ items, title, totalLabel, totalDisplay }: { items: ChartItem[]; title: string; totalLabel: string; totalDisplay: string }) {
  const [active, setActive] = useState<string | null>(null);
  const size = 168;
  const r = 66;
  const sw = 20;
  const c = 2 * Math.PI * r;
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  let offset = 0;
  const cur = items.find((i) => i.key === active);
  return (
    <div className="donut-wrap">
      <div className="donut" role="img" aria-label={title}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {items.map((i) => {
              const len = (i.value / total) * c;
              const seg = (
                <circle
                  key={i.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={i.color}
                  strokeWidth={active === i.key ? sw + 4 : sw}
                  strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
                  strokeDashoffset={-offset}
                  opacity={active && active !== i.key ? 0.3 : 1}
                  onPointerEnter={() => setActive(i.key)}
                  onPointerLeave={() => setActive(null)}
                  style={{ transition: "opacity .15s, stroke-width .15s" }}
                />
              );
              offset += len;
              return seg;
            })}
          </g>
        </svg>
        <div className="donut-c">
          <small>{cur ? cur.label : totalLabel}</small>
          <b>{cur ? cur.display : totalDisplay}</b>
          {cur && <small>{Math.round((cur.value / total) * 100)} %</small>}
        </div>
      </div>
      <ul className="legend-list">
        {items.map((i) => (
          <li key={i.key} onPointerEnter={() => setActive(i.key)} onPointerLeave={() => setActive(null)} data-on={active === i.key || undefined}>
            <span><i style={{ background: i.color }} />{i.label}</span>
            <span className="num">{i.display} <small>{Math.round((i.value / total) * 100)} %</small></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One 100 % stacked bar (parts of a whole) with a value legend below. */
export function StackedBar({ items, title }: { items: ChartItem[]; title: string }) {
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <div>
      <div className="stack-bar" role="img" aria-label={`${title}: ${items.map((i) => `${i.label} ${i.display}`).join(", ")}`}>
        {items.filter((i) => i.value > 0).map((i) => (
          <div key={i.key} style={{ flexGrow: i.value, background: i.color }} title={`${i.label}: ${i.display}`} />
        ))}
      </div>
      <ul className="legend-list cols">
        {items.map((i) => (
          <li key={i.key}>
            <span><i style={{ background: i.color }} />{i.label}</span>
            <span className="num">{i.display} <small>{Math.round((i.value / total) * 100)} %</small></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
