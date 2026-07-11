"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Camera,
  CarFront,
  CheckCircle2,
  CircleAlert,
  Download,
  FileSpreadsheet,
  Fuel,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Pencil,
  Phone,
  Plus,
  Power,
  PowerOff,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Upload,
  UserCheck,
  Users,
  X,
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

type View =
  "dashboard" | "logs" | "vehicles" | "drivers" | "export" | "settings"
  | "fuel-types" | "fuel-prices" | "fuel-stations"
  | "fuel-transactions" | "fuel-validation" | "fuel-report";
const nav: { id: View; label: string; icon: typeof LayoutDashboard; group?: "BBM" }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "logs", label: "Data Harian Mobil", icon: BarChart3 },
  { id: "vehicles", label: "Data Kendaraan", icon: CarFront },
  { id: "drivers", label: "Data Driver", icon: Users },
  { id: "fuel-transactions", label: "Transaksi BBM", icon: Fuel, group: "BBM" },
  { id: "fuel-validation", label: "Validasi BBM", icon: ShieldCheck, group: "BBM" },
  { id: "fuel-report", label: "Laporan BBM", icon: FileSpreadsheet, group: "BBM" },
  { id: "fuel-types", label: "Jenis BBM", icon: Fuel, group: "BBM" },
  { id: "fuel-prices", label: "Harga BBM", icon: FileSpreadsheet, group: "BBM" },
  { id: "fuel-stations", label: "SPBU / Vendor", icon: Route, group: "BBM" },
  { id: "export", label: "Export Laporan", icon: Download },
  { id: "settings", label: "Pengaturan Akun", icon: Settings },
];

export default function AdminPage() {
  const router = useRouter();
  const store = useDemoStore();
  const [view, setView] = useState<View>("dashboard");
  const [menu, setMenu] = useState(false);
  const [createTarget, setCreateTarget] = useState<"vehicle" | "driver" | null>(
    null,
  );
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
    setView(id);
    setMenu(false);
  };
  return (
    <main className="admin-mobile-safe min-h-dvh bg-jne-pale lg:pl-72">
      {menu && (
        <button
          aria-label="Tutup menu"
          onClick={() => setMenu(false)}
          className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white lg:visible lg:translate-x-0 ${menu ? "visible translate-x-0" : "invisible -translate-x-full"}`}
      >
        <div className="border-b border-slate-100 p-5">
          <Brand />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {nav.map((item, index) => (
            <div key={item.id}>
              {item.group && nav[index - 1]?.group !== item.group && (
                <p className="mb-2 mt-5 px-4 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{item.group}</p>
              )}
              <button
                onClick={() => choose(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${view === item.id ? "bg-jne-blue text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 font-bold text-jne-blue">
              AO
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {store.currentUser.name}
              </p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start"
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
          <button
            onClick={() => setMenu(true)}
            className="rounded-xl p-2 text-slate-600 lg:hidden"
          >
            <Menu />
          </button>
          <div>
            <h1 className="font-extrabold text-slate-900">
              {nav.find((n) => n.id === view)?.label}
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block">
              Movetra · Move Smarter, Work Better
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Sistem aktif
        </div>
      </header>
      <div className="p-3 sm:p-7">
        {view === "dashboard" && (
          <Dashboard
            onNavigate={setView}
            onCreate={(target) => {
              setCreateTarget(target);
              setView(target === "vehicle" ? "vehicles" : "drivers");
            }}
          />
        )}
        {view === "logs" && <LogsPanel />}
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
      </div>
    </main>
  );
}

function Dashboard({
  onNavigate,
  onCreate,
}: {
  onNavigate: (view: View) => void;
  onCreate: (target: "vehicle" | "driver") => void;
}) {
  const { users, vehicles, logs } = useDemoStore();
  const today = jakartaNow().date;
  const todayLogs = logs.filter((l) => l.date === today);
  const drivers = users.filter((u) => u.role === "DRIVER" && u.active);
  const unfinished = todayLogs.filter((l) => l.status === "Belum Selesai");
  const reviewed = todayLogs.filter((l) => l.status === "Perlu Diperiksa");
  const total = todayLogs.reduce((sum, l) => sum + (l.distance ?? 0), 0);
  const completed = todayLogs.filter((l) => l.endKm != null).length;
  const completion = todayLogs.length
    ? Math.round((completed / todayLogs.length) * 100)
    : 0;
  const cards = [
    {
      label: "Kendaraan aktif",
      value: vehicles.filter((v) => v.active).length,
      detail: `${vehicles.length} total armada`,
      icon: Truck,
      tone: "from-blue-500 to-blue-700",
      view: "vehicles" as View,
    },
    {
      label: "Driver aktif",
      value: drivers.length,
      detail: `${users.filter((u) => u.role === "DRIVER").length} driver terdaftar`,
      icon: UserCheck,
      tone: "from-violet-500 to-violet-700",
      view: "drivers" as View,
    },
    {
      label: "Perjalanan hari ini",
      value: todayLogs.length,
      detail: `${completed} sudah selesai`,
      icon: Route,
      tone: "from-emerald-500 to-emerald-700",
      view: "logs" as View,
    },
    {
      label: "Total jarak hari ini",
      value: `${formatKm(total)} KM`,
      detail: "Akumulasi perjalanan",
      icon: Activity,
      tone: "from-orange-400 to-red-500",
      view: "logs" as View,
    },
  ];
  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="relative rounded-[1.5rem] bg-[#193475] p-5 text-white sm:isolate sm:overflow-hidden sm:rounded-[1.75rem] sm:bg-gradient-to-br sm:from-[#12265f] sm:via-jne-blue sm:to-[#24449a] sm:p-8 sm:shadow-[0_22px_50px_rgba(23,45,114,.24)]">
        <div className="absolute -right-16 -top-20 hidden h-64 w-64 rounded-full border-[45px] border-white/5 sm:block" />
        <div className="absolute -bottom-24 right-1/3 hidden h-48 w-48 rounded-full bg-jne-red/20 blur-3xl sm:block" />
        <div className="relative flex flex-col justify-between gap-5 sm:gap-7 lg:flex-row lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-blue-100 sm:mb-4 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" /> Pusat Kendali Operasional
            </div>
            <h2 className="max-w-xl text-[1.65rem] font-extrabold leading-tight sm:text-3xl">
              Selamat datang, Admin Operasional
            </h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-blue-100">
              <CalendarDays className="h-4 w-4" />{" "}
              {new Intl.DateTimeFormat("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Jakarta",
              }).format(new Date())}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <Button
              className="h-auto min-h-11 whitespace-normal border border-white/20 bg-white px-2 text-xs leading-tight text-jne-blue hover:bg-blue-50 sm:px-4 sm:text-sm"
              onClick={() => onCreate("vehicle")}
            >
              <Plus className="h-4 w-4" /> Tambah Kendaraan
            </Button>
            <Button
              className="h-auto min-h-11 whitespace-normal border border-white/20 bg-white/10 px-2 text-xs leading-tight text-white shadow-none hover:bg-white/20 sm:px-4 sm:text-sm"
              onClick={() => onCreate("driver")}
            >
              <Plus className="h-4 w-4" /> Tambah Driver
            </Button>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => onNavigate(c.view)}
            className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-3 text-left sm:p-5 sm:shadow-sm sm:transition sm:hover:-translate-y-0.5 sm:hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <span
                className={`rounded-xl bg-gradient-to-br p-2.5 text-white sm:rounded-2xl sm:p-3 sm:shadow-lg ${c.tone}`}
              >
                <c.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-jne-blue sm:h-5 sm:w-5" />
            </div>
            <p className="mt-4 break-words text-xl font-extrabold text-slate-900 sm:mt-5 sm:text-2xl">
              {c.value}
            </p>
            <p className="mt-1 text-xs font-semibold leading-tight text-slate-700 sm:text-sm">
              {c.label}
            </p>
            <p className="mt-1 text-[11px] leading-tight text-slate-400 sm:text-xs">{c.detail}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="overflow-hidden border-0 shadow-soft xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900">
                Aktivitas terbaru
              </h3>
              <p className="text-sm text-slate-500">
                Perjalanan yang masuk hari ini
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate("logs")}
            >
              Lihat semua <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            {todayLogs.length ? (
              <div>
                {todayLogs.slice(0, 5).map((log) => (
                  <LogRow key={log.id} log={log} />
                ))}
              </div>
            ) : (
              <Empty text="Belum ada perjalanan hari ini." />
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="overflow-hidden border-0 bg-slate-900 text-white shadow-soft">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">Penyelesaian Hari Ini</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {completed} dari {todayLogs.length} perjalanan
                  </p>
                </div>
                <span className="text-2xl font-extrabold">{completion}%</span>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </CardContent>
          </Card>
          <AlertCard
            label="Belum input KM awal"
            value={Math.max(0, drivers.length - todayLogs.length)}
            detail="driver aktif"
            tone="amber"
          />
          <AlertCard
            label="Belum input KM akhir"
            value={unfinished.length}
            detail="perjalanan berjalan"
            tone="amber"
          />
          <AlertCard
            label="Perlu diperiksa"
            value={reviewed.length}
            detail="data tidak biasa"
            tone="red"
          />
        </div>
      </div>
    </div>
  );
}

function AlertCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: "amber" | "red";
}) {
  return (
    <Card className={tone === "red" && value ? "border-red-200" : ""}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <p className="text-xs text-slate-500">{detail}</p>
        </div>
        <span
          className={`grid h-11 min-w-11 place-items-center rounded-xl text-lg font-extrabold ${tone === "red" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}
        >
          {value}
        </span>
      </CardContent>
    </Card>
  );
}

function LogRow({ log }: { log: VehicleLog }) {
  const { users, vehicles } = useDemoStore();
  const user = users.find((u) => u.id === log.driverId);
  const vehicle = vehicles.find((v) => v.id === log.vehicleId);
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
        <Truck className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">
          {vehicle?.plate} · {user?.name}
        </p>
        <p className="text-xs text-slate-500">
          {log.startTime} — {log.endTime ?? "masih berjalan"} ·{" "}
          {formatKm(log.distance)} KM
        </p>
      </div>
      <Badge>{log.status}</Badge>
    </div>
  );
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
                      {log.status !== "Dikunci" && log.endKm != null ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => store.lockLog(log.id)}
                        >
                          <Lock className="h-3.5 w-3.5" /> Kunci
                        </Button>
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
      className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-xs font-extrabold text-jne-blue disabled:bg-slate-100 disabled:text-slate-300"
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
      title="Data kendaraan"
      subtitle={`${store.vehicles.filter((v) => v.active).length} aktif dari ${store.vehicles.length} kendaraan`}
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((v) => (
          <Card
            key={v.id}
            className={`group overflow-hidden border-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${!v.active ? "opacity-75" : ""}`}
          >
            <div
              className={`h-1.5 ${v.active ? "bg-gradient-to-r from-jne-blue to-blue-400" : "bg-slate-300"}`}
            />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <span
                  className={`rounded-2xl p-3 ${v.active ? "bg-blue-50 text-jne-blue" : "bg-slate-100 text-slate-400"}`}
                >
                  <CarFront className="h-7 w-7" />
                </span>
                <div className="flex flex-col items-end gap-2">
                  <Badge>{v.active ? "Aktif" : "Nonaktif"}</Badge>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-600">
                    {v.unitGroup}
                  </span>
                </div>
              </div>
              <h3 className="mt-5 text-xl font-extrabold tracking-tight text-slate-900">
                {v.plate}
              </h3>
              <p className="mt-1 text-sm font-bold text-jne-blue">{v.code}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Jenis
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-700">
                    {v.type}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    KM Terakhir
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-700">
                    {formatKm(v.lastKm)}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setEditing(v)}>
                  <Pencil className="h-4 w-4" /> Ubah
                </Button>
                <Button
                  variant={v.active ? "danger" : "primary"}
                  disabled={savingId === v.id}
                  onClick={() => toggle(v)}
                >
                  {v.active ? (
                    <PowerOff className="h-4 w-4" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                  {v.active ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!rows.length && (
          <Card className="md:col-span-2 xl:col-span-3">
            <Empty text="Kendaraan tidak ditemukan." />
          </Card>
        )}
      </div>
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
      title="Data driver"
      subtitle={`${drivers.filter((u) => u.active).length} aktif dari ${drivers.length} driver`}
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((u) => {
          const vehicle = store.vehicles.find((v) => v.id === u.vehicleId);
          const initials = u.name
            .split(" ")
            .map((x) => x[0])
            .slice(0, 2)
            .join("");
          return (
            <Card
              key={u.id}
              className={`overflow-hidden border-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${!u.active ? "opacity-75" : ""}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <span
                    className={`grid h-14 w-14 place-items-center rounded-2xl text-lg font-extrabold ${u.active ? "bg-gradient-to-br from-jne-blue to-blue-500 text-white shadow-lg" : "bg-slate-100 text-slate-400"}`}
                  >
                    {initials}
                  </span>
                  <Badge>{u.active ? "Aktif" : "Nonaktif"}</Badge>
                </div>
                <h3 className="mt-4 text-lg font-extrabold capitalize text-slate-900">
                  {u.name.toLowerCase()}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <Phone className="h-3.5 w-3.5" /> {u.phone}
                </p>
                <p className="mt-1 text-xs font-extrabold tracking-wide text-jne-blue">
                  ID LOGIN: {u.loginId ?? "-"}
                </p>
                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Kendaraan Utama
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-700">
                    {vehicle
                      ? `${vehicle.plate} · ${vehicle.code}`
                      : "Belum ditentukan"}
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setEditing(u)}>
                    <Pencil className="h-4 w-4" /> Ubah
                  </Button>
                  <Button variant="outline" onClick={() => setResetting(u)}>
                    <KeyRound className="h-4 w-4" /> Reset Password
                  </Button>
                  <Button
                    variant={u.active ? "danger" : "primary"}
                    disabled={savingId === u.id}
                    onClick={() => toggle(u)}
                  >
                    {u.active ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                    {u.active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                  <Button
                    variant="danger"
                    disabled={savingId === u.id}
                    onClick={() => remove(u)}
                  >
                    <Trash2 className="h-4 w-4" /> Hapus
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!rows.length && (
          <Card className="md:col-span-2 xl:col-span-3">
            <Empty text="Driver tidak ditemukan." />
          </Card>
        )}
      </div>
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
                className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-jne-blue"
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
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-jne-blue">
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
              className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-jne-blue focus:ring-4 focus:ring-blue-50"
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
