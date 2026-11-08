"use client";

import { useId, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type Day = { day: string; count: number };

export function TripActivityChart({ days, period, onPeriodChange }: {
  days: Day[]; period: number; onPeriodChange: (period: number) => void;
}) {
  const gradient = useId();
  const [active, setActive] = useState<number | null>(null);
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const max = Math.ceil(Math.max(1, ...days.map(day => day.count)) / 4) * 4;
  const last = days.length - 1;
  const points = days.map((day, i) => ({ x: 36 + i * 688 / Math.max(1, last), y: 180 - day.count / max * 148 }));
  const line = points.map(({ x, y }, i) => {
    if (!i) return `M ${x} ${y}`;
    const prev = points[i - 1];
    const mid = (prev.x + x) / 2;
    return `C ${mid} ${prev.y}, ${mid} ${y}, ${x} ${y}`;
  }).join(" ");
  const highlighted = active == null ? null : points[active];
  return <Card className="min-w-0 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-xl font-extrabold">Aktivitas Perjalanan</h3><p className="mt-2 text-sm text-slate-500"><strong className="mr-1 text-2xl tabular-nums text-slate-900">{total.toLocaleString("id-ID")}</strong> perjalanan dalam {period} hari</p></div>
      <div className="flex rounded-lg bg-slate-100 p-1" aria-label="Periode grafik">{[7, 30].map(p => <button key={p} type="button" aria-pressed={p === period} onClick={() => { setActive(null); onPeriodChange(p); }} className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${p === period ? "bg-admin-primary text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}>{p} hari</button>)}</div>
    </div>
    {total ? <div key={period} className="mt-3 motion-safe:animate-[trip-chart-enter_240ms_ease-out]">
      <div className="relative" onPointerLeave={e => { if (e.pointerType === "mouse") setActive(null); }}>
        <svg viewBox="0 0 760 200" className="block w-full text-admin-primary" aria-hidden="true">
          <defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="100%"><stop stopColor="currentColor" stopOpacity=".23" /><stop offset="1" stopColor="currentColor" stopOpacity=".025" /></linearGradient></defs>
          {[0, 1, 2, 3, 4].map(tick => <g key={tick}><line x1="36" x2="724" y1={180 - tick * 37} y2={180 - tick * 37} stroke="#e2e8f0" strokeDasharray={tick ? "4 5" : undefined} /><text x="28" y={184 - tick * 37} textAnchor="end" fill="#64748b" fontSize="15">{max * tick / 4}</text></g>)}
          <path d={`${line} L 724 180 L 36 180 Z`} fill={`url(#${gradient})`} />
          <path d={line} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {highlighted && <line x1={highlighted.x} x2={highlighted.x} y1="22" y2="180" stroke="currentColor" strokeOpacity=".42" strokeDasharray="4 4" />}
          {points.map(({ x, y }, i) => <g key={days[i].day}>
            {(i === last || i === active) && <circle cx={x} cy={y} r="11" fill="currentColor" opacity=".15" />}
            <circle cx={x} cy={y} r={i === last || i === active ? 6 : period === 7 ? 3.5 : 2} fill={i === last || i === active ? "currentColor" : "white"} stroke={i === last || i === active ? "white" : "currentColor"} strokeWidth="2" />
          </g>)}
        </svg>
        <div className="absolute inset-y-0 left-[2.5%] right-[2.5%] flex" role="group" aria-label="Jumlah perjalanan per tanggal">
          {days.map((day, i) => <button type="button" key={day.day} aria-label={`${formatDate(day.day)}: ${day.count} perjalanan${i === last ? ", hari ini" : ""}`} className="min-w-0 flex-1 cursor-crosshair rounded-sm" onPointerEnter={e => { if (e.pointerType === "mouse") setActive(i); }} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(i)} onKeyDown={e => { if (e.key === "Escape") setActive(null); }} />)}
        </div>
        {highlighted && active != null && <div aria-hidden="true" style={{ left: `${Math.max(25, Math.min(75, highlighted.x / 7.6))}%` }} className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-lg bg-admin-navy px-3 py-2 text-xs text-white shadow-lg"><span className="text-slate-200">{formatDate(days[active].day)}</span><strong className="ml-2">{days[active].count.toLocaleString("id-ID")} perjalanan</strong></div>}
      </div>
      <div className="flex justify-between gap-2 px-[4.7%] text-xs text-slate-500">{days.filter((_, i) => i === 0 || i === Math.floor(last / 2) || i === last).map(d => <span key={d.day}>{formatDate(d.day)}</span>)}</div>
      <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-admin-primary ring-2 ring-blue-100" /> Hari ini · {days[last].count.toLocaleString("id-ID")} perjalanan</p>
    </div> : <div className="grid min-h-48 place-items-center text-center text-sm text-slate-500">Belum ada perjalanan dalam periode ini.</div>}
  </Card>;
}
