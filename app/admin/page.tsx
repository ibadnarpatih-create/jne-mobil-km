"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Camera,
  CarFront,
  CheckCircle2,
  CircleAlert,
  Download,
  FileSpreadsheet,
  FolderOpen,
  Fuel,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Truck,
  Upload,
  UserCheck,
  UserRound,
  Users,
  X,
  ClipboardList,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { useDemoStore } from "@/lib/demo-store";
import { createUuid, formatDate, formatKm, jakartaNow } from "@/lib/utils";
import type { LogStatus, User, Vehicle, VehicleLog } from "@/lib/types";
import { BulkImportModal } from "@/components/bulk-import-modal";
import { FuelMasterPanel } from "@/components/fuel/fuel-master-panel";
import { FuelTransactionsPanel } from "@/components/fuel/fuel-transactions-panel";
import { FileManagerPanel } from "@/components/file-manager-panel";
import { TrackingPanel } from "@/components/tracking-panel";
import { AssetTripsPanel } from "@/components/asset-trips-panel";
import { loadFuelTransactions, type FuelTransactionRecord } from "@/lib/fuel/admin";
import { FuelStatusBadge } from "@/components/fuel/fuel-status";
import { MasterDataTable, MasterSummary, RecordStatus, RowActions } from "@/components/admin/master-data-table";

type View =
  "dashboard" | "tracking" | "logs" | "vehicles" | "drivers" | "export" | "settings"
  | "fuel-types" | "fuel-prices" | "fuel-stations"
  | "fuel-transactions" | "fuel-validation" | "fuel-report" | "file-manager" | "asset-trips";
const nav: { id: View; label: string; icon: typeof LayoutDashboard; group: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { id: "tracking", label: "Tracking", icon: Route, group: "Overview" },
  { id: "logs", label: "Data Harian Mobil", icon: BarChart3, group: "Operasional" },
  { id: "asset-trips", label: "Trip Aset Antar Hub", icon: ClipboardList, group: "Operasional" },
  { id: "vehicles", label: "Data Aset", icon: CarFront, group: "Master Data" },
  { id: "drivers", label: "Data Karyawan", icon: Users, group: "Master Data" },
  { id: "fuel-transactions", label: "Transaksi BBM", icon: Fuel, group: "Manajemen BBM" },
  { id: "fuel-validation", label: "Validasi BBM", icon: ShieldCheck, group: "Manajemen BBM" },
  { id: "fuel-report", label: "Laporan BBM", icon: FileSpreadsheet, group: "Manajemen BBM" },
  { id: "fuel-types", label: "Jenis BBM", icon: Fuel, group: "Data Master BBM" },
  { id: "fuel-prices", label: "Harga BBM", icon: FileSpreadsheet, group: "Data Master BBM" },
  { id: "fuel-stations", label: "SPBU / Vendor", icon: Route, group: "Data Master BBM" },
  { id: "file-manager", label: "File Manager", icon: FolderOpen, group: "Sistem" },
  { id: "export", label: "Export Laporan", icon: Download, group: "Sistem" },
  { id: "settings", label: "Pengaturan Akun", icon: Settings, group: "Sistem" },
];

const validViews = new Set<View>(nav.map((item) => item.id));

function viewFromUrl(): View {
  const value = new URLSearchParams(window.location.search).get("view");
  return value && validViews.has(value as View) ? (value as View) : "dashboard";
}

export default function AdminPage() {
  const router = useRouter();
  const store = useDemoStore();
  const [view, setView] = useState<View>("dashboard");
  const [menu, setMenu] = useState(false);
  const [createTarget, setCreateTarget] = useState<"vehicle" | "driver" | null>(
    null,
  );
  useEffect(() => {
    const syncView = () => {
      setView(viewFromUrl());
      setMenu(false);
      setCreateTarget(null);
    };
    syncView();
    window.addEventListener("popstate", syncView);
    return () => window.removeEventListener("popstate", syncView);
  }, []);
  useEffect(() => {
    if (
      store.hydrated &&
      (!store.currentUser || store.currentUser.role !== "ADMIN")
    )
      router.replace("/");
  }, [store.hydrated, store.currentUser, router]);
  if (
    !store.hydrated ||
    !store.currentUser ||
    store.currentUser.role !== "ADMIN"
  )
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-slate-500">
        Menyiapkan dashboard…
      </div>
    );
  const choose = (id: View) => {
    if (id !== view) {
      const url = new URL(window.location.href);
      url.searchParams.delete("transaction");
      if (id === "dashboard") url.searchParams.delete("view");
      else url.searchParams.set("view", id);
      window.history.pushState(
        { ...(window.history.state ?? {}) },
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
    setView(id);
    setMenu(false);
  };
  return (
    <main className="admin-mobile-safe movetra-workspace min-h-dvh bg-admin-canvas lg:pl-60">
      {menu && (
        <button
          aria-label="Tutup menu"
          onClick={() => setMenu(false)}
          className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-admin-navy text-white lg:visible lg:translate-x-0 ${menu ? "visible translate-x-0" : "invisible -translate-x-full"}`}
      >
        <div className="border-b border-white/20 px-4 py-5">
          <Brand compact inverse />
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-blue-200">Operasional Armada</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          {nav.map((item, index) => (
            <div key={item.id}>
              {item.group && nav[index - 1]?.group !== item.group && (
                <p className="mb-1 mt-4 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-300">{item.group}</p>
              )}
              <button
                onClick={() => choose(item.id)}
                aria-current={view === item.id ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${view === item.id ? "bg-admin-primary text-white" : "text-slate-100 hover:bg-white/10"}`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/20 p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-teal-50 font-bold text-jne-blue">
              AO
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {store.currentUser.name}
              </p>
              <p className="text-xs text-slate-300">Administrator</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-white/10"
            onClick={() => {
              store.logout();
              router.replace("/");
            }}
          >
            <LogOut className="h-4 w-4" /> Keluar
          </Button>
        </div>
      </aside>
      <header className="relative z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:sticky sm:top-0 sm:bg-white/95 sm:px-7 sm:backdrop-blur">
        <div className="flex items-center gap-3">
          <button aria-label="Buka navigasi" aria-expanded={menu}
            onClick={() => setMenu(true)}
            className="rounded-xl p-2 text-slate-600 lg:hidden"
          >
            <Menu />
          </button>
          <div>
            <h1 className="text-sm font-bold text-admin-primary">
              <span className="font-medium text-slate-500">Workspace / </span>
              {nav.find((n) => n.id === view)?.label}
            </h1>
          </div>
        </div>
        <button onClick={() => choose("settings")} aria-label={`Akun ${store.currentUser.name}`} title={store.currentUser.name} className="grid h-9 w-9 place-items-center rounded-full bg-teal-50 text-jne-blue transition hover:bg-teal-100">
          <UserRound className="h-5 w-5" />
        </button>
      </header>
      <div className="mx-auto max-w-[1800px] p-4 sm:p-8">
        {view === "dashboard" && (
          <Dashboard
            onNavigate={choose}
            onCreate={(target) => {
              setCreateTarget(target);
              choose(target === "vehicle" ? "vehicles" : "drivers");
            }}
          />
        )}
        {view === "logs" && <LogsPanel />}
        {view === "tracking" && <TrackingPanel />}
        {view === "vehicles" && (
          <VehiclesPanel
            autoAdd={createTarget === "vehicle"}
            onAutoAddHandled={() => setCreateTarget(null)}
          />
        )}
        {view === "drivers" && (
          <DriversPanel
            autoAdd={createTarget === "driver"}
            onAutoAddHandled={() => setCreateTarget(null)}
          />
        )}
        {view === "export" && <ExportPanel />}
        {view === "settings" && <SettingsPanel />}
        {view === "fuel-types" && <FuelMasterPanel section="types" />}
        {view === "fuel-prices" && <FuelMasterPanel section="prices" />}
        {view === "fuel-stations" && <FuelMasterPanel section="stations" />}
        {view === "fuel-transactions" && <FuelTransactionsPanel mode="transactions" />}
        {view === "fuel-validation" && <FuelTransactionsPanel mode="validation" />}
        {view === "fuel-report" && <FuelTransactionsPanel mode="report" />}
        {view === "file-manager" && <FileManagerPanel />}
        {view === "asset-trips" && <AssetTripsPanel />}
      </div>
    </main>
  );
}

function Dashboard({ onNavigate, onCreate }: {
  onNavigate: (view: View) => void;
  onCreate: (target: "vehicle" | "driver") => void;
}) {
  const { users, vehicles, logs } = useDemoStore();
  const [period, setPeriod] = useState(7);
  const [fuel, setFuel] = useState<FuelTransactionRecord[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    loadFuelTransactions().then(rows => { if (active) setFuel(rows); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  const today = jakartaNow().date;
  const todayLogs = logs.filter(l => l.date === today);
  const drivers = users.filter(u => u.role === "DRIVER" && u.active);
  const completed = todayLogs.filter(l => l.endKm != null).length;
  const vehicleWorkload = vehicles.map(vehicle => {
    const rows = todayLogs.filter(log => log.vehicleId === vehicle.id);
    return { vehicle, trips: rows.length, distance: rows.reduce((sum, log) => sum + (log.distance ?? 0), 0) };
  }).filter(item => item.trips > 0).sort((a, b) => b.distance - a.distance);
  const cards = [
    { label: "Kendaraan aktif", value: vehicles.filter(v => v.active).length, detail: `dari ${vehicles.length} kendaraan`, icon: Truck, view: "vehicles" },
    { label: "Driver aktif", value: drivers.length, detail: `dari ${users.filter(u => u.role === "DRIVER").length} driver`, icon: UserCheck, view: "drivers" },
    { label: "Perjalanan hari ini", value: todayLogs.length, detail: `${completed} perjalanan selesai`, icon: Route, view: "logs" },
    { label: "Total jarak", value: `${formatKm(todayLogs.reduce((sum, l) => sum + (l.distance ?? 0), 0))} km`, detail: "Akumulasi hari ini", icon: Gauge, view: "logs" },
  ] as const;
  const days = Array.from({ length: period }, (_, i) => {
    const date = new Date(today + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() - period + i + 1);
    const day = date.toISOString().slice(0, 10);
    return { day, count: logs.filter(log => log.date === day).length };
  });
  const max = Math.max(1, ...days.map(d => d.count));
  const points = days.map((d, i) => [36 + i * 688 / (period - 1), 180 - d.count / max * 146]);
  const line = points.map(p => p.join(",")).join(" ");
  const attention = [
    { label: "Belum input KM awal", count: drivers.filter(d => !todayLogs.some(l => l.driverId === d.id)).length, view: "drivers" },
    { label: "Belum input KM akhir", count: logs.filter(l => !l.endTime && l.status === "Belum Selesai").length, view: "logs" },
    { label: "Validasi BBM", count: fuel?.filter(f => f.status === "SUBMITTED" || f.status === "NEED_REVIEW").length, view: "fuel-validation" },
  ] as const;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="text-[28px] font-extrabold leading-tight">Dashboard Operasional</h2><p className="mt-1 text-sm text-slate-600">Pantau armada, perjalanan, dan penggunaan BBM dalam satu tempat.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm"><CalendarDays className="h-4 w-4" />{new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date())}</span>
        <Button variant="outline" onClick={() => onNavigate("export")}><Download className="h-4 w-4" /> Export Laporan</Button>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map(({ label, value, detail, icon: Icon, view }) => <button key={label} onClick={() => onNavigate(view)} className="group flex min-w-0 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-blue-300 sm:flex-row sm:gap-4 sm:p-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700"><Icon className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><strong className="block text-[30px] leading-tight tabular-nums">{value}</strong><span className="text-xs text-slate-500">{detail}</span></span></button>)}
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(260px,1fr)]">
      <Card className="min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xl font-extrabold">Aktivitas Perjalanan</h3><div className="flex rounded-lg bg-slate-100 p-1">{[7, 30].map(p => <button key={p} aria-pressed={p === period} onClick={() => setPeriod(p)} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${p === period ? "bg-admin-primary text-white" : "text-slate-600"}`}>{p} hari</button>)}</div></div>
        {days.some(d => d.count) ? <><svg viewBox="0 0 760 200" className="mt-3 w-full text-admin-primary" role="img" aria-label={`Jumlah perjalanan per hari selama ${period} hari`}>
          <defs><linearGradient id="trip-area" x2="0" y2="1"><stop stopColor="currentColor" stopOpacity=".28" /><stop offset="1" stopColor="currentColor" stopOpacity=".03" /></linearGradient></defs>
          {[0, .25, .5, .75, 1].map(n => <g key={n}><line x1="36" x2="724" y1={180 - n * 146} y2={180 - n * 146} stroke="#e2e8f0" /><text x="29" y={184 - n * 146} textAnchor="end" fill="#475569" fontSize="12">{Number((max * n).toFixed(1))}</text></g>)}
          <polygon points={`36,180 ${line} 724,180`} fill="url(#trip-area)" /><polyline points={line} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
          {points.map(([x, y], i) => <circle key={days[i].day} cx={x} cy={y} r={period === 7 ? 4 : 2.5} fill="currentColor" stroke="white"><title>{formatDate(days[i].day)}: {days[i].count} perjalanan</title></circle>)}
        </svg><div className="flex justify-between px-3 text-xs text-slate-600">{days.filter((_, i) => period === 7 ? i % 2 === 0 : i === 0 || i === 14 || i === 29).map(d => <span key={d.day}>{formatDate(d.day)}</span>)}</div></> : <div className="grid min-h-48 place-items-center text-sm text-slate-500">Belum ada perjalanan dalam periode ini.</div>}
      </Card>
      <Card className="bg-admin-navy p-5 text-white">
        <h3 className="text-xl font-extrabold">Perlu Perhatian</h3>
        <div className="mt-2 divide-y divide-white/20">{attention.map((a, i) => <button key={a.label} onClick={() => onNavigate(a.view)} className="flex w-full items-center gap-3 py-3 text-left text-sm hover:text-blue-200"><span className={`h-2.5 w-2.5 rounded-full ${i === 2 ? "bg-amber-400" : "bg-admin-alert"}`} /><span className="flex-1">{a.label}</span><strong>{a.count ?? (failed ? "—" : "…")}</strong><ArrowUpRight className="h-4 w-4" /></button>)}</div>
        <Button variant="outline" className="mt-4 w-full" onClick={() => onNavigate("fuel-validation")}>Tinjau validasi BBM</Button>
      </Card>
    </div>
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-xl font-extrabold">Transaksi BBM Terbaru</h3><p className="text-sm text-slate-500">Ringkasan pengisian dan pembayaran</p></div><Button variant="outline" onClick={() => onNavigate("fuel-transactions")}>Lihat semua <ArrowUpRight className="h-4 w-4" /></Button></CardHeader>
      {failed ? <p role="alert" className="px-5 pb-5 text-sm text-red-700">Transaksi BBM gagal dimuat.</p> : !fuel ? <div role="status" className="m-5 h-24 animate-pulse rounded-xl bg-slate-100"><span className="sr-only">Memuat transaksi BBM</span></div> : !fuel.length ? <p className="px-5 pb-5 text-sm text-slate-500">Belum ada transaksi BBM.</p> : <div className="overflow-x-auto px-4 pb-4"><table className="w-full min-w-[620px] text-sm"><thead className="bg-slate-100 text-left"><tr><th className="p-3">Kendaraan / Driver</th><th className="p-3 text-right">Jarak</th><th className="p-3 text-right">Estimasi liter</th><th className="p-3 text-right">Pembayaran</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{fuel.slice(0, 4).map(f => <tr key={f.id}><td className="p-3"><strong className="whitespace-nowrap">{vehicles.find(v => v.id === f.vehicleId)?.plate ?? "—"}</strong><span className="block text-xs text-slate-500">{users.find(u => u.id === f.driverId)?.name ?? "—"}</span></td><td className="p-3 text-right">{formatKm(f.totalDistance)} km</td><td className="p-3 text-right">{f.estimatedLiters.toLocaleString("id-ID")} L</td><td className="whitespace-nowrap p-3 text-right">Rp {f.realPayment.toLocaleString("id-ID")}</td><td className="p-3"><FuelStatusBadge status={f.status} /></td></tr>)}</tbody></table></div>}
    </Card>
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => onCreate("vehicle")}><Plus className="h-4 w-4" /> Tambah kendaraan</Button><Button variant="outline" onClick={() => onCreate("driver")}><Plus className="h-4 w-4" /> Tambah driver</Button></div>
      <Card className="overflow-hidden border-0 shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900">Beban kerja aset</h3>
            <p className="text-sm text-slate-500">Ranking kendaraan berdasarkan total KM hari ini</p>
          </div>
          <Gauge className="h-5 w-5 text-jne-blue" />
        </CardHeader>
        <CardContent className="pt-2">
          {vehicleWorkload.length ? <div className="divide-y divide-slate-100">{vehicleWorkload.slice(0, 5).map((item, index) => <div key={item.vehicle.id} className="flex items-center gap-3 py-3"><span className={`grid h-8 w-8 place-items-center rounded-lg text-sm font-extrabold ${index === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{item.vehicle.plate} · {item.vehicle.code}</p><p className="text-xs text-slate-500">{item.trips} perjalanan</p></div><p className="font-extrabold text-slate-900">{formatKm(item.distance)} KM</p></div>)}</div> : <Empty text="Belum ada data beban aset hari ini." />}
        </CardContent>
      </Card>
    <FuelAssetInsights vehicles={vehicles} items={fuel ?? []} loading={!fuel && !failed} failed={failed} />
  </div>;
}

function FuelAssetInsights({ vehicles, items, loading, failed }: { vehicles: ReturnType<typeof useDemoStore>["vehicles"]; items: FuelTransactionRecord[]; loading: boolean; failed: boolean }) {
  if (failed) return <Card className="p-5"><p className="text-sm text-slate-600">Insight efisiensi belum tersedia karena data BBM gagal dimuat.</p></Card>;
  const summary = vehicles.map((vehicle) => {
    const rows = items.filter((item) => item.vehicleId === vehicle.id && item.status !== "REJECTED");
    const fullRows = rows.filter((row) => row.fillingType === "FULL" && row.totalDistance > 0 && row.estimatedLiters > 0);
    const distance = fullRows.reduce((sum, row) => sum + row.totalDistance, 0);
    const liters = fullRows.reduce((sum, row) => sum + row.estimatedLiters, 0);
    return { vehicle, liters, distance, efficiency: liters ? distance / liters : 0, cost: rows.reduce((sum, row) => sum + row.realPayment, 0), count: rows.length, validCount: fullRows.length };
  }).filter((item) => item.count > 0).sort((a, b) => b.cost - a.cost).slice(0, 5);
  const maxCost = Math.max(...summary.map((item) => item.cost), 1);
  return <Card className="overflow-hidden border-0 shadow-soft"><CardHeader className="flex flex-row items-start justify-between border-b border-slate-100 pb-4"><div><h3 className="font-extrabold text-slate-900">Efisiensi dan beban BBM aset</h3><p className="text-sm text-slate-500">Perhitungan valid: total KM transaksi BBM ÷ liter pengisian FULL</p></div><Fuel className="h-5 w-5 shrink-0 text-orange-500" /></CardHeader><CardContent className="pt-4">{loading ? <p className="py-5 text-sm text-slate-500">Memuat insight BBM...</p> : summary.length ? <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><InsightKpi label="Aset dianalisis" value={String(summary.length)} /><InsightKpi label="Transaksi non-rejected" value={String(summary.reduce((sum, item) => sum + item.count, 0))} /><InsightKpi label="Basis hitung valid" value={`${summary.reduce((sum, item) => sum + item.validCount, 0)} isi FULL`} /></div><div className="divide-y divide-slate-100">{summary.map((item, index) => { const attention = item.validCount > 0 && item.efficiency < 8; return <div key={item.vehicle.id} className="py-3"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-orange-50 text-sm font-extrabold text-orange-700">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{item.vehicle.plate} · {item.vehicle.code}</p><p className="text-xs text-slate-500">{item.distance.toLocaleString("id-ID")} KM · {item.liters.toLocaleString("id-ID", { maximumFractionDigits: 1 })} L · {item.count} transaksi</p></div><div className="text-right"><p className={`font-extrabold ${attention ? "text-red-700" : "text-emerald-700"}`}>{item.validCount ? `${item.efficiency.toFixed(1)} KM/L` : "Belum cukup data"}</p><p className="text-[11px] text-slate-400">{attention ? "Perlu perhatian" : `Rp ${item.cost.toLocaleString("id-ID")}`}</p></div></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${attention ? "bg-red-400" : "bg-emerald-400"}`} style={{ width: `${Math.min(100, (item.cost / maxCost) * 100)}%` }} /></div></div>; })}</div><p className="text-xs text-slate-400">Transaksi PARTIAL tidak dimasukkan ke rumus KM/L agar hasil tidak menyesatkan. Grafik batang menunjukkan beban biaya relatif antar aset.</p></div> : <Empty text="Belum ada data transaksi BBM." />}</CardContent></Card>;
}

function InsightKpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-lg font-extrabold text-slate-900">{value}</p></div>;
}


function LogsPanel() {
  const store = useDemoStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [photo, setPhoto] = useState<{
    log: VehicleLog;
    type: "awal" | "akhir";
  } | null>(null);
  const [editing, setEditing] = useState<VehicleLog | null>(null);
  const rows = useMemo(
    () =>
      store.logs.filter((log) => {
        const user = store.users.find((u) => u.id === log.driverId);
        const vehicle = store.vehicles.find((v) => v.id === log.vehicleId);
        const hay =
          `${user?.name} ${vehicle?.plate} ${vehicle?.code}`.toLowerCase();
        return (
          (!search || hay.includes(search.toLowerCase())) &&
          (!status || log.status === status) &&
          (!date || log.date === date)
        );
      }),
    [store.logs, store.users, store.vehicles, search, status, date],
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-extrabold">Data harian mobil</h2>
          <p className="mt-1 text-sm text-slate-500">
            Periksa bukti foto dan kunci data yang sudah benar.
          </p>
        </div>
        <Button variant="outline" onClick={() => exportCsv(rows, store)}>
          <Download className="h-4 w-4" /> Unduh CSV
        </Button>
      </div>
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              placeholder="Cari driver, plat, kode…"
            />
          </div>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua status</option>
            {["Belum Selesai", "Selesai", "Perlu Diperiksa", "Dikunci"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </Select>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Tanggal",
                  "Kendaraan",
                  "Driver",
                  "Waktu",
                  "KM Awal",
                  "KM Akhir",
                  "Jarak",
                  "Foto",
                  "Status",
                  "Aksi",
                ].map((h) => (
                  <th key={h} className="px-4 py-3 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((log) => {
                const vehicle = store.vehicles.find(
                  (v) => v.id === log.vehicleId,
                );
                const user = store.users.find((u) => u.id === log.driverId);
                return (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4 font-semibold">
                      {formatDate(log.date)}
                    </td>
                    <td className="px-4 py-4">
                      <strong>{vehicle?.plate}</strong>
                      <small className="block text-slate-500">
                        {vehicle?.code}
                      </small>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {user?.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {log.startTime} — {log.endTime ?? "—"}
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {formatKm(log.startKm)}
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {formatKm(log.endKm)}
                    </td>
                    <td className="px-4 py-4 font-extrabold text-jne-blue">
                      {formatKm(log.distance)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1">
                        <PhotoButton
                          label="A"
                          disabled={!log.startPhoto}
                          onClick={() => setPhoto({ log, type: "awal" })}
                        />
                        <PhotoButton
                          label="B"
                          disabled={!log.endPhoto}
                          onClick={() => setPhoto({ log, type: "akhir" })}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge>{log.status}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      {log.status !== "Dikunci" ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditing(log)}>
                            <Pencil className="h-3.5 w-3.5" /> Periksa / Revisi
                          </Button>
                          {log.endKm != null && (
                            <Button size="sm" variant="outline" onClick={() => store.lockLog(log.id)}>
                              <Lock className="h-3.5 w-3.5" /> Kunci
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Terkunci</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <Empty text="Tidak ada data yang sesuai filter." />}
        </div>
      </Card>
      {photo && <PhotoModal data={photo} onClose={() => setPhoto(null)} />}
      {editing && <LogReviewModal log={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function LogReviewModal({ log, onClose }: { log: VehicleLog; onClose: () => void }) {
  const store = useDemoStore();
  const [startKm, setStartKm] = useState(String(log.startKm));
  const [endKm, setEndKm] = useState(log.endKm == null ? "" : String(log.endKm));
  const [status, setStatus] = useState<LogStatus>(log.status);
  const [note, setNote] = useState(log.adminNote ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const start = Number(startKm);
  const end = endKm === "" ? undefined : Number(endKm);
  const distance = end == null || !Number.isFinite(start) ? undefined : end - start;

  async function save(lockAfter = false) {
    if (!Number.isInteger(start) || start < 0) return setError("KM awal wajib berupa angka bulat yang valid.");
    if (end != null && (!Number.isInteger(end) || end < start)) return setError("KM akhir harus sama dengan atau lebih besar dari KM awal.");
    if (lockAfter && end == null) return setError("KM akhir wajib diisi sebelum data dikunci.");
    setBusy(true);
    setError("");
    try {
      await store.updateLog(log.id, {
        startKm: start,
        endKm: end,
        status,
        adminNote: note,
      });
      if (lockAfter) await store.lockLog(log.id);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menyimpan revisi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-start justify-between">
          <div><h3 className="text-xl font-extrabold">Periksa / Revisi Data KM</h3><p className="mt-1 text-sm text-slate-500">Perubahan hanya dapat dilakukan sebelum data dikunci.</p></div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>KM Awal</Label><Input type="number" min="0" step="1" value={startKm} onChange={(e) => setStartKm(e.target.value)} /></div>
            <div><Label>KM Akhir</Label><Input type="number" min={startKm || "0"} step="1" value={endKm} onChange={(e) => setEndKm(e.target.value)} placeholder="Belum selesai" /></div>
          </div>
          <div className={`rounded-xl p-3 text-sm font-bold ${distance != null && distance > 300 ? "bg-red-50 text-red-700" : "bg-teal-50 text-jne-blue"}`}>
            Jarak hasil revisi: {distance == null ? "—" : `${formatKm(distance)} KM`}
          </div>
          <div><Label>Status verifikasi</Label><Select value={status} onChange={(e) => setStatus(e.target.value as LogStatus)}><option>Belum Selesai</option><option>Selesai</option><option>Perlu Diperiksa</option></Select></div>
          {status === "Selesai" && !log.endTime && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Menyimpan akan menutup perjalanan agar driver dapat memulai perjalanan baru. Jam akhir dicatat sebagai waktu penutupan admin; KM akhir yang kosong tetap belum dilaporkan.</p>}
          <div><Label>Catatan admin</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: Koreksi kelebihan 1 digit setelah cek foto" /></div>
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button disabled={busy} variant="outline" onClick={() => save(false)}><ShieldCheck className="h-4 w-4" /> Simpan Verifikasi</Button>
            <Button disabled={busy || end == null} onClick={() => save(true)}><Lock className="h-4 w-4" /> Simpan & Kunci</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PhotoButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={`Foto ${label === "A" ? "awal" : "akhir"}`}
      className="grid h-8 w-8 place-items-center rounded-lg bg-teal-50 text-xs font-extrabold text-jne-blue disabled:bg-slate-100 disabled:text-slate-300"
    >
      <Camera className="h-4 w-4" />
    </button>
  );
}
function PhotoModal({
  data,
  onClose,
}: {
  data: { log: VehicleLog; type: "awal" | "akhir" };
  onClose: () => void;
}) {
  const src = data.type === "awal" ? data.log.startPhoto : data.log.endPhoto;
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="font-extrabold">Foto KM {data.type}</h3>
            <p className="text-xs text-slate-500">
              {formatDate(data.log.date)} ·{" "}
              {data.type === "awal" ? data.log.startTime : data.log.endTime}
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2">
            <X />
          </button>
        </div>
        {src === "demo" ? (
          <DemoDashboard
            km={data.type === "awal" ? data.log.startKm : data.log.endKm}
          />
        ) : (
          <img
            src={src}
            alt={`Bukti KM ${data.type}`}
            className="max-h-[70vh] w-full object-contain"
          />
        )}
      </div>
    </div>
  );
}
function DemoDashboard({ km }: { km?: number }) {
  return (
    <div className="grid h-80 place-items-center bg-gradient-to-b from-slate-700 to-slate-950 p-8">
      <div className="w-full max-w-md rounded-[3rem] border-4 border-slate-500 bg-slate-900 p-8 shadow-2xl">
        <div className="mx-auto grid h-32 w-56 place-items-center rounded-2xl border border-slate-600 bg-black font-mono text-4xl font-bold tracking-widest text-amber-100">
          {formatKm(km)}
        </div>
        <p className="mt-5 text-center text-xs font-bold uppercase tracking-[.3em] text-slate-400">
          Odometer · KM
        </p>
      </div>
    </div>
  );
}

function VehiclesPanel({
  autoAdd = false,
  onAutoAddHandled = () => undefined,
}: {
  autoAdd?: boolean;
  onAutoAddHandled?: () => void;
}) {
  const store = useDemoStore();
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [unit, setUnit] = useState("all");
  const [savingId, setSavingId] = useState("");
  const [notice, setNotice] = useState("");
  const defaultUnit = store.assetUnitLabels[0] ?? "INBOUND";
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [deletingAssets, setDeletingAssets] = useState(false);
  useEffect(() => { setSelectedAssets([]); }, [search, status, unit]);
  const deleteSelectedAssets = async () => {
    const targets = store.vehicles.filter(v => selectedAssets.includes(v.id));
    if (!targets.length || deletingAssets) return;
    if (!window.confirm(`Hapus ${targets.length} aset terpilih?\n${targets.map(v => v.plate).join(", ")}\nAset yang memiliki riwayat tidak akan dihapus. Penghapusan tidak dapat dibatalkan.`)) return;
    setDeletingAssets(true);
    const failed: string[] = [];
    const errors: string[] = [];
    let deleted = 0;
    try {
      for (const asset of targets) {
        try { await store.deleteVehicle(asset.id); deleted++; }
        catch (error) { failed.push(asset.id); errors.push(`${asset.plate}: ${error instanceof Error ? error.message : "Gagal dihapus"}`); }
      }
      setSelectedAssets(failed);
      setNotice(`${deleted} aset berhasil dihapus.${failed.length ? " " + failed.length + " aset tidak dihapus. " + errors.join(" • ") : ""}`);
    } finally { setDeletingAssets(false); }
  };
  useEffect(() => {
    if (autoAdd) {
      setEditing({
        id: createUuid(),
        code: "",
        plate: "",
        type: "",
        unitGroup: defaultUnit,
        lastKm: 0,
        active: true,
      });
      onAutoAddHandled();
    }
  }, [autoAdd, onAutoAddHandled, defaultUnit]);
  const rows = store.vehicles.filter(
    (v) =>
      `${v.plate} ${v.code} ${v.type} ${v.unitGroup}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === "all" || (status === "active" ? v.active : !v.active)) &&
      (unit === "all" || v.unitGroup === unit),
  );
  const save = async (vehicle: Vehicle) => {
    if (
      store.vehicles.some(
        (x) =>
          x.plate.toLowerCase() === vehicle.plate.toLowerCase() &&
          x.id !== vehicle.id,
      )
    )
      throw new Error("Nomor plat sudah digunakan kendaraan lain.");
    await store.saveVehicle(vehicle);
    setEditing(null);
    setNotice(
      valueExists(store.vehicles, vehicle.id)
        ? "Data kendaraan berhasil diperbarui."
        : "Kendaraan baru berhasil ditambahkan dan aktif.",
    );
  };
  const toggle = async (vehicle: Vehicle) => {
    setSavingId(vehicle.id);
    try {
      await store.saveVehicle({ ...vehicle, active: !vehicle.active });
      setNotice(
        vehicle.active
          ? "Kendaraan berhasil dinonaktifkan."
          : "Kendaraan berhasil diaktifkan dan siap dipilih driver.",
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Status kendaraan gagal diubah.",
      );
    } finally {
      setSavingId("");
    }
  };
  return (
    <MasterLayout
      title="Data Aset"
      subtitle="Kelola kendaraan dan penugasan armada."
      button="Tambah Kendaraan"
      onAdd={() =>
        setEditing({
          id: createUuid(),
          code: "",
          plate: "",
          type: "",
          unitGroup: defaultUnit,
          lastKm: 0,
          active: true,
        })
      }
      secondaryButton="Import File"
      onSecondary={() => setImporting(true)}
    >
      {notice && <ActionNotice text={notice} onClose={() => setNotice("")} />}
      <MasterSummary items={[
        { label: "Total Aset", value: store.vehicles.length, icon: <CarFront className="h-5 w-5" /> },
        { label: "Aktif", value: store.vehicles.filter(v => v.active).length, icon: <CheckCircle2 className="h-5 w-5" />, tone: "bg-green-100 text-green-700" },
        { label: "Digunakan", value: store.vehicles.filter(v => store.logs.some(l => l.vehicleId === v.id && !l.endTime && l.status === "Belum Selesai")).length, icon: <Truck className="h-5 w-5" /> },
        { label: "Nonaktif", value: store.vehicles.filter(v => !v.active).length, icon: <PowerOff className="h-5 w-5" />, tone: "bg-red-100 text-red-700" },
      ]} />
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              placeholder="Cari plat, kode, jenis, atau unit aset"
            />
          </div>
          <Select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="sm:w-48"
          >
            <option value="all">Semua unit</option>
            {store.assetUnitLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="sm:w-48"
          >
            <option value="all">Semua status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </Select>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
        <span>{selectedAssets.length} aset dipilih · Checkbox judul memilih semua hasil filter, termasuk halaman lain.</span>
        <div className="flex gap-2"><Button variant="outline" disabled={deletingAssets} onClick={() => { setStatus("inactive"); setSelectedAssets([]); }}>Tampilkan nonaktif</Button><Button variant="danger" disabled={!selectedAssets.length || deletingAssets} onClick={() => void deleteSelectedAssets()}><Trash2 className="h-4 w-4" />{deletingAssets ? "Menghapus…" : "Hapus terpilih"}</Button></div>
      </div>
      <MasterDataTable rows={rows} resetKey={search + status + unit} selection={{ ids: selectedAssets, onChange: setSelectedAssets, disabled: deletingAssets, label: v => v.plate }} columns={["Aset / Plat Nomor", "Jenis / Unit", "Driver", "KM terakhir", "Status", "Aksi"]} empty="Kendaraan tidak ditemukan." render={v => {
        const assigned = store.users.filter(u => u.role === "DRIVER" && u.vehicleId === v.id);
        const inUse = store.logs.some(l => l.vehicleId === v.id && !l.endTime && l.status === "Belum Selesai");
        return <><td><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700"><CarFront className="h-5 w-5" /></span><div><p className="whitespace-nowrap font-bold">{v.plate}</p><p className="text-xs text-slate-500">{v.code}</p></div></div></td><td><p>{v.type}</p><p className="text-xs text-slate-500">{v.unitGroup}</p></td><td><p className="max-w-52">{assigned.map(u => u.name).join(", ") || "Belum ditentukan"}</p></td><td className="whitespace-nowrap tabular-nums">{formatKm(v.lastKm)}</td><td>{inUse && v.active ? <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Digunakan</span> : <RecordStatus active={v.active} />}</td><td><div className="flex items-center justify-end gap-1"><Button size="icon" variant="ghost" aria-label={`Ubah ${v.plate}`} onClick={() => setEditing(v)}><Pencil className="h-4 w-4" /></Button><RowActions label={v.plate}><Button variant="ghost" onClick={() => setEditing(v)}><Pencil className="h-4 w-4" /> Ubah data</Button><Button variant={v.active ? "danger" : "ghost"} disabled={savingId === v.id} onClick={() => toggle(v)}><Power className="h-4 w-4" />{v.active ? "Nonaktifkan" : "Aktifkan"}</Button><Button variant="danger" disabled={savingId === v.id} onClick={async () => { if (!window.confirm(`Hapus aset ${v.plate}? Penghapusan tidak dapat dibatalkan. Aset dengan riwayat operasional tidak dapat dihapus.`)) return; setSavingId(v.id); try { await store.deleteVehicle(v.id); setNotice("Aset berhasil dihapus."); } catch (error) { setNotice(error instanceof Error ? error.message : "Aset gagal dihapus."); } finally { setSavingId(""); } }}><Trash2 className="h-4 w-4" /> Hapus aset</Button></RowActions></div></td></>;
      }} />
      {editing && (
        <VehicleForm
          value={editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      {importing && (
        <BulkImportModal
          kind="vehicle"
          onClose={() => setImporting(false)}
          onComplete={setNotice}
        />
      )}
    </MasterLayout>
  );
}

function VehicleForm({
  value,
  onClose,
  onSave,
}: {
  value: Vehicle;
  onClose: () => void;
  onSave: (v: Vehicle) => Promise<void>;
}) {
  const { assetUnitLabels } = useDemoStore();
  const [v, setV] = useState({
    ...value,
    unitGroup: value.unitGroup ?? assetUnitLabels[0] ?? "INBOUND",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(v);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kendaraan gagal disimpan.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={value.code ? "Ubah Kendaraan" : "Tambah Kendaraan Baru"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kode mobil">
            <Input
              value={v.code}
              onChange={(e) =>
                setV({ ...v, code: e.target.value.toUpperCase() })
              }
              placeholder="Contoh: TGR042"
              required
            />
          </Field>
          <Field label="Plat nomor">
            <Input
              value={v.plate}
              onChange={(e) =>
                setV({ ...v, plate: e.target.value.toUpperCase() })
              }
              placeholder="B 9042 BXB"
              required
            />
          </Field>
        </div>
        <Field label="Unit aset">
          <Select
            value={v.unitGroup}
            onChange={(e) => setV({ ...v, unitGroup: e.target.value })}
          >
            {assetUnitLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Jenis kendaraan">
          <Input
            value={v.type}
            onChange={(e) => setV({ ...v, type: e.target.value })}
            placeholder="Contoh: Mobil Box"
            required
          />
        </Field>
        <Field label="KM terakhir">
          <Input
            type="number"
            min="0"
            value={v.lastKm}
            onChange={(e) => setV({ ...v, lastKm: Number(e.target.value) })}
            required
          />
        </Field>
        <Field label="Status kendaraan">
          <Select
            value={v.active ? "1" : "0"}
            onChange={(e) => setV({ ...v, active: e.target.value === "1" })}
          >
            <option value="1">Aktif — dapat dipilih driver</option>
            <option value="0">Nonaktif — tidak dapat dipilih</option>
          </Select>
        </Field>
        {error && (
          <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <Button className="w-full" size="lg" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan Kendaraan"}
        </Button>
      </form>
    </Modal>
  );
}

function DriversPanel({
  autoAdd = false,
  onAutoAddHandled = () => undefined,
}: {
  autoAdd?: boolean;
  onAutoAddHandled?: () => void;
}) {
  const store = useDemoStore();
  const drivers = store.users.filter((u) => u.role === "DRIVER");
  const [editing, setEditing] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [savingId, setSavingId] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (autoAdd) {
      setEditing({
        id: createUuid(),
        name: "",
        loginId: "",
        phone: "",
        password: "",
        role: "DRIVER",
        active: true,
      });
      onAutoAddHandled();
    }
  }, [autoAdd, onAutoAddHandled]);
  const rows = drivers.filter(
    (u) =>
      `${u.name} ${u.loginId ?? ""} ${u.phone}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === "all" || (status === "active" ? u.active : !u.active)),
  );
  const save = async (user: User) => {
    if (!user.loginId?.trim()) throw new Error("ID Login wajib diisi.");
    if (
      drivers.some(
        (x) =>
          (x.loginId ?? "").toUpperCase() === user.loginId!.toUpperCase() &&
          x.id !== user.id,
      )
    )
      throw new Error("ID Login sudah digunakan driver lain.");
    if (drivers.some((x) => x.phone === user.phone && x.id !== user.id))
      throw new Error("Nomor HP sudah digunakan driver lain.");
    await store.saveUser(user);
    setEditing(null);
    setNotice(
      valueExists(drivers, user.id)
        ? "Data driver berhasil diperbarui."
        : "Driver baru berhasil ditambahkan dan aktif.",
    );
  };
  const toggle = async (user: User) => {
    setSavingId(user.id);
    try {
      await store.saveUser({ ...user, active: !user.active });
      setNotice(
        user.active
          ? "Akun driver berhasil dinonaktifkan."
          : "Akun driver berhasil diaktifkan dan dapat login.",
      );
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Status driver gagal diubah.",
      );
    } finally {
      setSavingId("");
    }
  };
  const remove = async (user: User) => {
    if (
      !window.confirm(
        `Hapus akun ${user.name}? Tindakan ini tidak dapat dibatalkan.`,
      )
    )
      return;
    setSavingId(user.id);
    try {
      await store.deleteUser(user.id);
      setNotice("Akun driver berhasil dihapus.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Driver gagal dihapus.");
    } finally {
      setSavingId("");
    }
  };
  return (
    <MasterLayout
      title="Data Karyawan"
      subtitle="Kelola profil, akses, dan penugasan driver."
      button="Tambah Driver"
      onAdd={() =>
        setEditing({
          id: createUuid(),
          name: "",
          loginId: "",
          phone: "",
          password: "",
          role: "DRIVER",
          active: true,
        })
      }
      secondaryButton="Import File"
      onSecondary={() => setImporting(true)}
    >
      {notice && <ActionNotice text={notice} onClose={() => setNotice("")} />}
      <MasterSummary items={[
        { label: "Total Karyawan", value: drivers.length, icon: <Users className="h-5 w-5" /> },
        { label: "Aktif", value: drivers.filter(u => u.active).length, icon: <UserCheck className="h-5 w-5" />, tone: "bg-green-100 text-green-700" },
        { label: "Nonaktif", value: drivers.filter(u => !u.active).length, icon: <PowerOff className="h-5 w-5" />, tone: "bg-red-100 text-red-700" },
      ]} />
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              placeholder="Cari nama, ID login, atau nomor HP driver"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="sm:w-48"
          >
            <option value="all">Semua status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </Select>
        </CardContent>
      </Card>
      <MasterDataTable rows={rows} resetKey={search + status} columns={["Karyawan", "ID Login", "Peran", "Kendaraan Utama", "Status", "Aksi"]} empty="Driver tidak ditemukan." render={u => {
        const vehicle = store.vehicles.find(v => v.id === u.vehicleId);
        return <><td><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">{u.name.split(" ").filter(Boolean).slice(0,2).map(n => n[0]).join("")}</span><div><p className="font-semibold">{u.name}</p><p className="text-xs text-slate-500">{u.phone}</p></div></div></td><td className="whitespace-nowrap">{u.loginId || "—"}</td><td>Driver</td><td><p className="whitespace-nowrap">{vehicle?.plate ?? "Belum ditentukan"}</p>{vehicle && <p className="text-xs text-slate-500">{vehicle.code}</p>}</td><td><RecordStatus active={u.active} /></td><td><div className="flex items-center justify-end gap-1"><Button size="icon" variant="ghost" aria-label={`Ubah ${u.name}`} onClick={() => setEditing(u)}><Pencil className="h-4 w-4" /></Button><RowActions label={u.name}><Button variant="ghost" onClick={() => setEditing(u)}><Pencil className="h-4 w-4" /> Ubah data</Button><Button variant="ghost" onClick={() => setResetting(u)}><KeyRound className="h-4 w-4" /> Reset password</Button><Button variant="ghost" disabled={savingId === u.id} onClick={() => toggle(u)}><Power className="h-4 w-4" />{u.active ? "Nonaktifkan" : "Aktifkan"}</Button><Button variant="danger" disabled={savingId === u.id} onClick={() => remove(u)}><Trash2 className="h-4 w-4" /> Hapus</Button></RowActions></div></td></>;
      }} />
      {editing && (
        <DriverForm
          value={editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      {resetting && (
        <ResetPasswordModal
          user={resetting}
          onClose={() => setResetting(null)}
          onSave={async (password) => {
            await store.resetUserPassword(resetting.id, password);
            setResetting(null);
            setNotice(`Password ${resetting.name} berhasil diperbarui.`);
          }}
        />
      )}
      {importing && (
        <BulkImportModal
          kind="driver"
          onClose={() => setImporting(false)}
          onComplete={setNotice}
        />
      )}
    </MasterLayout>
  );
}
function ResetPasswordModal({
  user,
  onClose,
  onSave,
}: {
  user: User;
  onClose: () => void;
  onSave: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password gagal diubah.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Reset Password Driver" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">
          Buat password baru untuk <strong>{user.name}</strong>.
        </p>
        <Field label="Password baru">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            placeholder="Minimal 8 karakter"
            required
          />
        </Field>
        {error && (
          <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <Button className="w-full" size="lg" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan Password Baru"}
        </Button>
      </form>
    </Modal>
  );
}
function DriverForm({
  value,
  onClose,
  onSave,
}: {
  value: User;
  onClose: () => void;
  onSave: (u: User) => Promise<void>;
}) {
  const { vehicles } = useDemoStore();
  const [u, setU] = useState({ ...value, loginId: value.loginId ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isNew = !value.name;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Driver gagal disimpan.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={isNew ? "Tambah Driver Baru" : "Ubah Data Driver"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nama lengkap driver">
          <Input
            value={u.name}
            onChange={(e) => setU({ ...u, name: e.target.value })}
            placeholder="Contoh: Ahmad Arifin"
            required
          />
        </Field>
        <Field label="ID Login / ID Kurir">
          <Input
            value={u.loginId ?? ""}
            onChange={(e) =>
              setU({
                ...u,
                loginId: e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9._-]/g, ""),
              })
            }
            placeholder="Contoh: TGR250"
            autoComplete="username"
            required
          />
        </Field>
        <Field label="Nomor HP">
          <Input
            value={u.phone}
            onChange={(e) =>
              setU({ ...u, phone: sanitizePhone(e.target.value) })
            }
            inputMode="tel"
            placeholder="08xxxxxxxxxx"
            required
          />
        </Field>
        <Field label={isNew ? "Password awal" : "Password"}>
          <Input
            type="password"
            value={u.password}
            onChange={(e) => setU({ ...u, password: e.target.value })}
            placeholder={
              isNew ? "Minimal 6 karakter" : "Tidak berubah jika kosong"
            }
            minLength={u.password ? 6 : undefined}
            required={isNew}
          />
        </Field>
        <Field label="Kendaraan utama">
          <Select
            value={u.vehicleId ?? ""}
            onChange={(e) =>
              setU({ ...u, vehicleId: e.target.value || undefined })
            }
          >
            <option value="">Tidak ditentukan</option>
            {vehicles
              .filter((v) => v.active)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} · {v.code}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Status akun">
          <Select
            value={u.active ? "1" : "0"}
            onChange={(e) => setU({ ...u, active: e.target.value === "1" })}
          >
            <option value="1">Aktif — dapat login</option>
            <option value="0">Nonaktif — akses ditutup</option>
          </Select>
        </Field>
        {error && (
          <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <Button className="w-full" size="lg" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan Driver"}
        </Button>
      </form>
    </Modal>
  );
}

function valueExists<T extends { id: string }>(items: T[], id: string) {
  return items.some((item) => item.id === id);
}
function sanitizePhone(value: string) {
  return value
    .split("")
    .filter((char) => char >= "0" && char <= "9")
    .join("");
}
function ActionNotice({
  text,
  onClose,
}: {
  text: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
      <span className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5" />
        {text}
      </span>
      <button onClick={onClose} className="rounded-lg p-1 hover:bg-emerald-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ExportPanel() {
  const store = useDemoStore();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [vehicle, setVehicle] = useState("");
  const rows = store.logs.filter(
    (l) =>
      (!from || l.date >= from) &&
      (!to || l.date <= to) &&
      (!vehicle || l.vehicleId === vehicle),
  );
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold">Export laporan</h2>
        <p className="mt-1 text-sm text-slate-500">
          Pilih periode, lalu unduh file siap dibuka di Excel.
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Dari tanggal">
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Field>
            <Field label="Sampai tanggal">
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
            <Field label="Kendaraan">
              <Select
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
              >
                <option value="">Semua kendaraan</option>
                {store.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} · {v.code}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">Data ditemukan</p>
            <p className="mt-1 text-3xl font-extrabold">
              {rows.length}{" "}
              <span className="text-base text-slate-500">perjalanan</span>
            </p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => exportCsv(rows, store)}
              disabled={!rows.length}
            >
              <Download className="h-5 w-5" /> Unduh CSV
            </Button>
            <Button
              size="lg"
              onClick={() => exportXlsx(rows, store)}
              disabled={!rows.length}
            >
              <FileSpreadsheet className="h-5 w-5" /> Unduh Excel XLSX
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h3 className="font-extrabold">Format file</h3>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              "Tanggal",
              "Kode Mobil",
              "Plat Nomor",
              "Nama Driver",
              "Jam Awal",
              "Jam Akhir",
              "KM Awal",
              "KM Akhir",
              "Jarak Tempuh",
            ].map((x, i) => (
              <span
                key={x}
                className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-jne-blue"
              >
                {i + 1}. {x}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPanel() {
  const { currentUser, isRemote, assetUnitLabels, saveAssetUnitLabels } =
    useDemoStore();
  const [labels, setLabels] = useState(assetUnitLabels.join("\n"));
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const saveLabels = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice("");
    setError("");
    try {
      await saveAssetUnitLabels(labels.split("\n"));
      setNotice("Nama unit aset berhasil disimpan.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nama unit gagal disimpan.",
      );
    }
  };
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold">Pengaturan akun</h2>
        <p className="mt-1 text-sm text-slate-500">
          Informasi akun administrator.
        </p>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-teal-50 text-jne-blue">
              <ShieldCheck className="h-8 w-8" />
            </span>
            <div>
              <h3 className="text-lg font-extrabold">{currentUser?.name}</h3>
              <p className="text-sm text-slate-500">{currentUser?.phone}</p>
              <Badge>Aktif</Badge>
            </div>
          </div>
          <div
            className={`mt-6 rounded-xl p-4 text-sm leading-6 ${isRemote ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
          >
            {isRemote
              ? "Supabase terhubung. Autentikasi, database, dan foto menggunakan backend produksi."
              : "Mode demo aktif. Isi variabel Supabase di Vercel untuk mengaktifkan backend produksi."}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h3 className="text-lg font-extrabold">Nama unit aset</h3>
            <p className="mt-1 text-sm text-slate-500">
              Isi satu nama unit per baris. Contoh: INBOUND dan OUTBOUND. Jika
              perusahaan lain hanya punya satu unit, cukup isi satu nama saja.
            </p>
          </div>
          <form onSubmit={saveLabels} className="space-y-3">
            <textarea
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-jne-blue focus:ring-4 focus:ring-teal-50"
              placeholder={"INBOUND\nOUTBOUND"}
            />
            {notice && (
              <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                {notice}
              </p>
            )}
            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">
              Simpan Nama Unit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function MasterLayout({
  title,
  subtitle,
  button,
  onAdd,
  secondaryButton,
  onSecondary,
  children,
}: {
  title: string;
  subtitle: string;
  button: string;
  onAdd: () => void;
  secondaryButton?: string;
  onSecondary?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-extrabold">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {secondaryButton && (
            <Button variant="outline" onClick={onSecondary}>
              <Upload className="h-4 w-4" /> {secondaryButton}
            </Button>
          )}
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4" /> {button}
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/50 p-4">
      <div className="my-6 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-extrabold">{title}</h3>
          <button onClick={onClose} className="rounded-xl p-2">
            <X />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="grid min-h-36 place-items-center p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function exportRows(
  logs: VehicleLog[],
  store: ReturnType<typeof useDemoStore>,
) {
  return logs.map((l) => {
    const v = store.vehicles.find((x) => x.id === l.vehicleId);
    const u = store.users.find((x) => x.id === l.driverId);
    return {
      Tanggal: formatDate(l.date),
      "Kode Mobil": v?.code ?? "",
      "Plat Nomor": v?.plate ?? "",
      "Nama Driver": u?.name.toUpperCase() ?? "",
      "Jam Awal": l.startTime,
      "Jam Akhir": l.endTime ?? "",
      "KM Awal": l.startKm,
      "KM Akhir": l.endKm ?? "",
      "Jarak Tempuh": l.distance ?? "",
    };
  });
}
function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function exportCsv(logs: VehicleLog[], store: ReturnType<typeof useDemoStore>) {
  const rows = exportRows(logs, store);
  const headers = Object.keys(
    rows[0] ?? {
      Tanggal: "",
      "Kode Mobil": "",
      "Plat Nomor": "",
      "Nama Driver": "",
      "Jam Awal": "",
      "Jam Akhir": "",
      "KM Awal": "",
      "KM Akhir": "",
      "Jarak Tempuh": "",
    },
  );
  const csv = [
    headers,
    ...rows.map((r) =>
      headers.map((h) => String(r[h as keyof typeof r] ?? "")),
    ),
  ]
    .map((row) => row.map((x) => `"${x.replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  downloadBlob(
    new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
    `DATA_HARIAN_MOBIL_${jakartaNow().date}.csv`,
  );
}
async function exportXlsx(
  logs: VehicleLog[],
  store: ReturnType<typeof useDemoStore>,
) {
  const XLSX = await import("xlsx");
  const rows = exportRows(logs, store);
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 24 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Harian Mobil");
  XLSX.writeFile(wb, `DATA_HARIAN_MOBIL_${jakartaNow().date}.xlsx`);
}
