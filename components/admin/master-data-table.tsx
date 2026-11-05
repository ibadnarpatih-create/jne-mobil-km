"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MasterDataTable<T extends { id: string }>({ rows, columns, render, empty, resetKey }: {
  rows: T[]; columns: string[]; render: (row: T) => ReactNode; empty: string; resetKey: string;
}) {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [resetKey]);
  const size = 10;
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  return <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="overflow-x-auto has-[details[open]]:pb-48"><table className="w-full min-w-[760px] text-left text-sm">
      <thead className="border-b border-slate-200 bg-slate-50 text-slate-600"><tr>{columns.map(c => <th key={c} className={`px-5 py-3 font-semibold ${c === "Aksi" ? "text-right" : ""}`}>{c}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{rows.slice((current - 1) * size, current * size).map(row => <tr key={row.id} className="hover:bg-blue-50/40 [&>td]:px-5 [&>td]:py-3">{render(row)}</tr>)}</tbody>
    </table>{!rows.length && <p className="p-10 text-center text-sm text-slate-500">{empty}</p>}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-600">
      <span>Menampilkan {rows.length ? (current - 1) * size + 1 : 0}–{Math.min(current * size, rows.length)} dari {rows.length} hasil</span>
      <nav aria-label="Halaman tabel" className="flex items-center gap-1">
        <Button size="icon" variant="outline" aria-label="Halaman sebelumnya" disabled={current === 1} onClick={() => setPage(current - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        {Array.from(new Set([1, current - 1, current, current + 1, pages].filter(p => p >= 1 && p <= pages))).sort((a,b) => a-b).map((p,i,a) => <span key={p} className="flex items-center gap-1">{i > 0 && p - a[i-1] > 1 && <span className="px-1">…</span>}<Button size="icon" variant={current === p ? "primary" : "outline"} aria-current={current === p ? "page" : undefined} onClick={() => setPage(p)}>{p}</Button></span>)}
        <Button size="icon" variant="outline" aria-label="Halaman berikutnya" disabled={current === pages} onClick={() => setPage(current + 1)}><ChevronRight className="h-4 w-4" /></Button>
      </nav>
    </div>
  </div>;
}

export function RecordStatus({ active, busy = false }: { active: boolean; busy?: boolean }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-green-100 text-green-800" : "bg-red-50 text-red-700"}`}>{busy ? "Digunakan" : active ? "Aktif" : "Nonaktif"}</span>;
}

export function RowActions({ label, children }: { label: string; children: ReactNode }) {
  return <details className="group relative inline-block text-left" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.open = false; }}>
    <summary aria-label={`Aksi ${label}`} className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 [&::-webkit-details-marker]:hidden"><MoreHorizontal className="h-5 w-5" /></summary>
    <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg [&>button]:w-full [&>button]:justify-start [&>button]:text-xs">{children}</div>
  </details>;
}

export function MasterSummary({ items }: { items: { label: string; value: number; icon: ReactNode; tone?: string }[] }) {
  return <div className={`grid grid-cols-2 gap-3 ${items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>{items.map(item => <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${item.tone ?? "bg-blue-100 text-blue-700"}`}>{item.icon}</span><div><p className="text-xs text-slate-600">{item.label}</p><p className="text-2xl font-extrabold tabular-nums">{item.value}</p></div></div>)}</div>;
}
