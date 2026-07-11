"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Gauge,
  Fuel,
  History,
  Home,
  ImageIcon,
  LogOut,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { useDemoStore } from "@/lib/demo-store";
import { formatDate, formatKm, jakartaNow } from "@/lib/utils";
import type { VehicleLog } from "@/lib/types";
import { compressImage } from "@/lib/image";
import { FuelInputScreen, FuelSubmitSuccess } from "@/components/fuel/fuel-input-screen";

type Screen = "home" | "history" | "start" | "end" | "success" | "fuel" | "fuel-success";

export default function DriverPage() {
  const router = useRouter();
  const store = useDemoStore();
  const { currentUser, vehicles, logs, hydrated, logout } = store;
  const [screen, setScreen] = useState<Screen>("home");
  const [lastResult, setLastResult] = useState<VehicleLog | null>(null);
  const today = jakartaNow().date;
  const myLogs = useMemo(
    () => logs.filter((l) => l.driverId === currentUser?.id),
    [logs, currentUser],
  );
  const activeTrip = myLogs.find((l) => l.status === "Belum Selesai");
  const todayCompleted = myLogs.find(
    (l) => l.date === today && l.endKm != null,
  );

  useEffect(() => {
    if (hydrated && (!currentUser || currentUser.role !== "DRIVER"))
      router.replace("/");
  }, [hydrated, currentUser, router]);
  if (!hydrated || !currentUser || currentUser.role !== "DRIVER")
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-slate-500">
        Menyiapkan aplikasi…
      </div>
    );

  const goHome = () => setScreen("home");
  return (
    <main className="mx-auto min-h-dvh max-w-2xl bg-jne-pale pb-24">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-5 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <Brand compact />
          <button
            aria-label="Keluar"
            onClick={() => {
              logout();
              router.replace("/");
            }}
            className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {screen === "home" && (
        <HomeScreen
          name={currentUser.name}
          activeTrip={activeTrip}
          todayCompleted={todayCompleted}
          logs={myLogs}
          vehicles={vehicles}
          onStart={() => setScreen("start")}
          onEnd={() => setScreen("end")}
          onHistory={() => setScreen("history")}
        />
      )}
      {screen === "history" && (
        <HistoryScreen logs={myLogs} vehicles={vehicles} onBack={goHome} />
      )}
      {screen === "start" && (
        <TripForm
          mode="start"
          activeTrip={activeTrip}
          onBack={goHome}
          onSaved={(log) => {
            setLastResult(log);
            setScreen("success");
          }}
        />
      )}
      {screen === "end" && activeTrip && (
        <TripForm
          mode="end"
          activeTrip={activeTrip}
          onBack={goHome}
          onSaved={(log) => {
            setLastResult(log);
            setScreen("success");
          }}
        />
      )}
      {screen === "success" && lastResult && (
        <SuccessScreen
          log={lastResult}
          vehicle={vehicles.find((v) => v.id === lastResult.vehicleId)}
          onDone={goHome}
        />
      )}
      {screen === "fuel" && (
        <FuelInputScreen
          user={currentUser}
          vehicles={vehicles}
          logs={myLogs}
          onBack={goHome}
          onSuccess={() => setScreen("fuel-success")}
        />
      )}
      {screen === "fuel-success" && <FuelSubmitSuccess onDone={goHome} />}

      {(screen === "home" || screen === "history") && (
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-2xl border-t border-slate-200 bg-white px-6 pt-2 shadow-[0_-8px_30px_rgba(15,23,42,.06)]">
          <button
            onClick={goHome}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs font-bold ${screen === "home" ? "text-jne-blue" : "text-slate-400"}`}
          >
            <Home className="h-5 w-5" />
            Beranda
          </button>
          <button
            onClick={() => setScreen("fuel")}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-xs font-bold text-slate-400"
          >
            <Fuel className="h-5 w-5" />
            Input BBM
          </button>
          <button
            onClick={() => setScreen("history")}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs font-bold ${screen === "history" ? "text-jne-blue" : "text-slate-400"}`}
          >
            <History className="h-5 w-5" />
            Riwayat Saya
          </button>
        </nav>
      )}
    </main>
  );
}

function HomeScreen({
  name,
  activeTrip,
  todayCompleted,
  logs,
  vehicles,
  onStart,
  onEnd,
  onHistory,
}: {
  name: string;
  activeTrip?: VehicleLog;
  todayCompleted?: VehicleLog;
  logs: VehicleLog[];
  vehicles: ReturnType<typeof useDemoStore>["vehicles"];
  onStart: () => void;
  onEnd: () => void;
  onHistory: () => void;
}) {
  const vehicle = vehicles.find(
    (v) => v.id === activeTrip?.vehicleId || v.id === todayCompleted?.vehicleId,
  );
  const completedTrips = logs.filter((l) => l.endKm != null);
  const totalDistance = completedTrips.reduce(
    (sum, l) => sum + (l.distance ?? 0),
    0,
  );
  const firstName = name.split(" ")[0];
  const initials = name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
  return (
    <div className="space-y-5 p-5">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#12265f] via-jne-blue to-[#284ca8] p-6 text-white shadow-[0_22px_45px_rgba(23,45,114,.25)]">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border-[38px] border-white/5" />
        <div className="absolute -bottom-20 left-16 h-40 w-40 rounded-full bg-jne-red/25 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/20 bg-white/10 text-sm font-extrabold backdrop-blur">
                {initials}
              </span>
              <div>
                <p className="text-xs font-semibold text-blue-200">
                  Halo, selamat bekerja
                </p>
                <h1 className="text-xl font-extrabold capitalize">
                  {firstName.toLowerCase()}
                </h1>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1.5 text-[10px] font-bold text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />{" "}
              ONLINE
            </span>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs text-blue-100">
            <CalendarDays className="h-4 w-4" />
            {new Intl.DateTimeFormat("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Asia/Jakarta",
            }).format(new Date())}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                Total Perjalanan
              </p>
              <p className="mt-1 text-xl font-extrabold">
                {completedTrips.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">
                Total Jarak
              </p>
              <p className="mt-1 text-xl font-extrabold">
                {formatKm(totalDistance)} <span className="text-xs">KM</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {activeTrip ? (
        <Card className="overflow-hidden border-0 shadow-soft">
          <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />{" "}
                  Perjalanan Berjalan
                </span>
                <h2 className="mt-3 text-2xl font-extrabold text-slate-900">
                  {vehicle?.plate}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {vehicle?.code} · {vehicle?.type}
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                <Navigation className="h-7 w-7" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-5 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <div className="absolute left-1/2 top-1/2 h-px w-12 -translate-x-1/2 bg-slate-300" />
              <InfoCompact
                label="KM Awal"
                value={formatKm(activeTrip.startKm)}
              />
              <InfoCompact
                label="Jam Mulai"
                value={activeTrip.startTime}
                align="right"
              />
            </div>
            <Button
              variant="secondary"
              size="lg"
              className="w-full shadow-lg shadow-red-200"
              onClick={onEnd}
            >
              <Gauge className="h-5 w-5" /> INPUT KM AKHIR{" "}
              <ArrowRight className="ml-auto h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      ) : todayCompleted ? (
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-white shadow-soft">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
                  Trip Terakhir Selesai
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-emerald-950">
                  Perjalanan berhasil dicatat
                </h2>
                <p className="mt-1 text-sm text-emerald-700">
                  {vehicle?.plate} · {formatKm(todayCompleted.distance)} KM
                  ditempuh
                </p>
              </div>
            </div>
            <Button
              size="lg"
              className="mt-5 w-full shadow-lg shadow-blue-200"
              onClick={onStart}
            >
              <Gauge className="h-5 w-5" /> MULAI TRIP BERIKUTNYA
              <ArrowRight className="ml-auto h-5 w-5" />
            </Button>
            <button
              onClick={onHistory}
              className="mt-3 flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-800"
            >
              Lihat riwayat perjalanan <ArrowRight className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-0 shadow-soft">
          <div className="h-1.5 bg-gradient-to-r from-jne-red to-orange-400" />
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-jne-red">
                  Siap Memulai
                </p>
                <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                  Catat KM Awal
                </h2>
                <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
                  Pilih kendaraan, masukkan kilometer, lalu foto dashboard.
                </p>
              </div>
              <span className="rounded-2xl bg-red-50 p-3 text-jne-red">
                <Gauge className="h-7 w-7" />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-jne-blue" />{" "}
                {vehicles.filter((v) => v.active).length} kendaraan tersedia
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <ShieldCheck className="h-4 w-4" /> Siap
              </span>
            </div>
            <Button
              size="lg"
              className="w-full shadow-lg shadow-blue-200"
              onClick={onStart}
            >
              <Gauge className="h-5 w-5" /> INPUT KM AWAL{" "}
              <ArrowRight className="ml-auto h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      )}
      <div>
        <p className="mb-3 px-1 text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Akses Cepat
        </p>
        <button
          onClick={onHistory}
          className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
        >
          <span className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-50 p-3 text-jne-blue">
              <History className="h-5 w-5" />
            </span>
            <span>
              <strong className="block text-sm text-slate-800">
                Riwayat Saya
              </strong>
              <small className="text-slate-500">
                Lihat seluruh perjalanan sebelumnya
              </small>
            </span>
          </span>
          <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-jne-blue" />
        </button>
      </div>
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-jne-blue" />
        <p className="text-xs leading-5 text-blue-800">
          <strong>Tips hari ini:</strong> Pastikan angka KM pada dashboard
          terlihat jelas sebelum menyimpan foto.
        </p>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}
function InfoCompact({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: string;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function TripForm({
  mode,
  activeTrip,
  onBack,
  onSaved,
}: {
  mode: "start" | "end";
  activeTrip?: VehicleLog;
  onBack: () => void;
  onSaved: (log: VehicleLog) => void;
}) {
  const store = useDemoStore();
  const { vehicles, currentUser, assetUnitLabels } = store;
  const defaultVehicle =
    activeTrip?.vehicleId ??
    currentUser?.vehicleId ??
    vehicles.find((v) => v.active)?.id ??
    "";
  const [vehicleId, setVehicleId] = useState(defaultVehicle);
  const [km, setKm] = useState("");
  const [photo, setPhoto] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("ALL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const vehicle = vehicles.find(
    (v) => v.id === (mode === "end" ? activeTrip?.vehicleId : vehicleId),
  );
  const isStart = mode === "start";
  const numericKm = Number(km.replace(/\D/g, ""));
  const minimum = isStart ? (vehicle?.lastKm ?? 0) : (activeTrip?.startKm ?? 0);
  const filteredVehicles = vehicles.filter((v) => {
    if (!v.active) return false;
    if (unitFilter !== "ALL" && v.unitGroup !== unitFilter) return false;
    const keyword = vehicleSearch.trim().toLowerCase();
    if (!keyword) return true;
    return [v.plate, v.code, v.type, v.unitGroup]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });

  useEffect(() => {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        (p) =>
          setLocation(
            `${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`,
          ),
        () => undefined,
        { timeout: 5000 },
      );
  }, []);
  const onFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa foto JPG, PNG, atau WEBP.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setPhoto(await compressImage(file));
    } catch {
      setError("Foto tidak dapat diproses. Silakan ambil foto kembali.");
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    setError("");
    if (!numericKm)
      return setError(`${isStart ? "KM awal" : "KM akhir"} wajib diisi.`);
    if (numericKm < minimum)
      return setError(
        `Angka KM tidak boleh lebih kecil dari ${formatKm(minimum)}.`,
      );
    if (!photo)
      return setError("Foto dashboard wajib diambil sebelum menyimpan.");
    const distance = numericKm - (activeTrip?.startKm ?? numericKm);
    if (
      !isStart &&
      distance > 300 &&
      !window.confirm(
        `Jarak tempuh ${formatKm(distance)} KM, lebih dari 300 KM. Yakin angkanya sudah benar?`,
      )
    )
      return;
    setBusy(true);
    try {
      onSaved(
        await (isStart
          ? store.startTrip(vehicleId, numericKm, photo, location)
          : store.endTrip(activeTrip!.id, numericKm, photo, location)),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Data belum berhasil disimpan.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-4">
        <button onClick={onBack} className="rounded-xl p-2 text-slate-600">
          <ChevronLeft />
        </button>
        <div>
          <h1 className="font-extrabold text-slate-900">
            Input KM {isStart ? "Awal" : "Akhir"}
          </h1>
          <p className="text-xs text-slate-500">
            {isStart
              ? "Sebelum kendaraan digunakan"
              : "Setelah kendaraan selesai digunakan"}
          </p>
        </div>
      </div>
      <div className="space-y-5 p-5">
        <Card>
          <CardContent className="space-y-4 p-5">
            {isStart ? (
              <div className="space-y-3">
                <Label>Pilih kendaraan</Label>
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <Input
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="pl-12"
                    placeholder="Cari plat, kode, jenis, atau unit aset"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setUnitFilter("ALL")}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ${
                      unitFilter === "ALL"
                        ? "bg-jne-blue text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Semua
                  </button>
                  {assetUnitLabels.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setUnitFilter(label)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ${
                        unitFilter === label
                          ? "bg-jne-blue text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Select
                  value={vehicleId}
                  onChange={(e) => {
                    setVehicleId(e.target.value);
                    setKm("");
                  }}
                >
                  <option value="">Pilih kendaraan aktif</option>
                  {filteredVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} — {v.code} — {v.unitGroup}
                    </option>
                  ))}
                </Select>
                {!filteredVehicles.length && (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                    Kendaraan tidak ditemukan. Coba hapus pencarian atau pilih
                    unit lain.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Kendaraan
                </p>
                <p className="mt-1 text-xl font-extrabold">{vehicle?.plate}</p>
                <p className="text-sm text-slate-500">
                  {vehicle?.code} · {vehicle?.unitGroup} · Jam awal{" "}
                  {activeTrip?.startTime}
                </p>
              </div>
            )}
            {vehicle && (
              <div className="rounded-xl bg-blue-50 px-4 py-3">
                <p className="text-xs font-semibold text-blue-700">
                  {isStart ? "KM terakhir kendaraan" : "KM awal perjalanan"}
                </p>
                <p className="mt-1 text-lg font-extrabold text-jne-blue">
                  {formatKm(minimum)} KM
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="km">KM {isStart ? "awal" : "akhir"}</Label>
              <div className="relative">
                <Input
                  id="km"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={km}
                  onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))}
                  className="pr-14 text-xl font-extrabold"
                  placeholder={String(minimum)}
                />
                <span className="absolute right-4 top-3.5 text-sm font-bold text-slate-400">
                  KM
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={photo ? "border-emerald-300" : ""}>
          <CardContent className="p-5">
            <Label>
              Foto dashboard KM {isStart ? "awal" : "akhir"}{" "}
              <span className="text-jne-red">*</span>
            </Label>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            {photo ? (
              <div>
                <div className="relative overflow-hidden rounded-xl bg-slate-100">
                  <img
                    src={photo}
                    alt="Foto dashboard"
                    className="h-52 w-full object-cover"
                  />
                  <div className="absolute right-3 top-3 rounded-full bg-emerald-500 p-1.5 text-white">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera className="h-4 w-4" /> Ambil Ulang Foto
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex min-h-44 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center"
              >
                <span className="mb-3 rounded-full bg-white p-4 text-jne-blue shadow-sm">
                  <Camera className="h-7 w-7" />
                </span>
                <strong className="text-sm">
                  {busy ? "Memproses foto…" : "Buka Kamera"}
                </strong>
                <span className="mt-1 text-xs text-slate-500">
                  Pastikan angka KM terlihat jelas
                </span>
              </button>
            )}
            {location && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" /> Lokasi
                berhasil dicatat
              </p>
            )}
          </CardContent>
        </Card>
        {error && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            {error}
          </div>
        )}
        <Button
          size="lg"
          variant={isStart ? "primary" : "secondary"}
          className="w-full"
          disabled={busy || !vehicle}
          onClick={submit}
        >
          {isStart ? "Simpan KM Awal" : "Selesaikan Perjalanan"}
        </Button>
      </div>
    </div>
  );
}

function SuccessScreen({
  log,
  vehicle,
  onDone,
}: {
  log: VehicleLog;
  vehicle?: ReturnType<typeof useDemoStore>["vehicles"][number];
  onDone: () => void;
}) {
  const completed = log.endKm != null;
  return (
    <div className="p-5 pt-10">
      <div className="text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-11 w-11" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold text-slate-900">
          {completed
            ? "Data perjalanan berhasil disimpan"
            : "KM awal berhasil disimpan"}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
          {completed
            ? "Terima kasih. Data hari ini sudah lengkap."
            : "Silakan input KM akhir setelah kendaraan selesai digunakan."}
        </p>
      </div>
      <Card className="mt-7">
        <CardHeader>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Ringkasan
          </p>
          <h2 className="text-lg font-extrabold">
            {vehicle?.plate} · {vehicle?.code}
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <InfoBox label="KM Awal" value={formatKm(log.startKm)} />
            <InfoBox label="Jam Awal" value={log.startTime} />
            {completed && (
              <>
                <InfoBox label="KM Akhir" value={formatKm(log.endKm)} />
                <InfoBox label="Jam Akhir" value={log.endTime ?? "—"} />
                <div className="col-span-2 rounded-xl bg-blue-50 p-4 text-center">
                  <p className="text-xs font-semibold text-blue-700">
                    Jarak Tempuh
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-jne-blue">
                    {formatKm(log.distance)}{" "}
                    <span className="text-base">KM</span>
                  </p>
                </div>
              </>
            )}
          </div>
          <Button className="mt-5 w-full" size="lg" onClick={onDone}>
            Kembali ke Beranda
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryScreen({
  logs,
  vehicles,
  onBack,
}: {
  logs: VehicleLog[];
  vehicles: ReturnType<typeof useDemoStore>["vehicles"];
  onBack: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-4">
        <button onClick={onBack} className="rounded-xl p-2 text-slate-600">
          <ChevronLeft />
        </button>
        <div>
          <h1 className="font-extrabold">Riwayat Saya</h1>
          <p className="text-xs text-slate-500">Semua perjalanan Anda</p>
        </div>
      </div>
      <div className="space-y-3 p-5">
        {logs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ImageIcon className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                Belum ada riwayat perjalanan.
              </p>
            </CardContent>
          </Card>
        ) : (
          logs.map((log) => {
            const vehicle = vehicles.find((v) => v.id === log.vehicleId);
            return (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        {formatDate(log.date)}
                      </p>
                      <h2 className="mt-1 font-extrabold">{vehicle?.plate}</h2>
                      <p className="text-xs text-slate-500">{vehicle?.code}</p>
                    </div>
                    <Badge>{log.status}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-xl bg-slate-50 p-3 text-center">
                    <div>
                      <p className="text-[10px] text-slate-500">KM AWAL</p>
                      <strong className="text-sm">
                        {formatKm(log.startKm)}
                      </strong>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">KM AKHIR</p>
                      <strong className="text-sm">{formatKm(log.endKm)}</strong>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">JARAK</p>
                      <strong className="text-sm text-jne-blue">
                        {formatKm(log.distance)} KM
                      </strong>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {log.startTime} — {log.endTime ?? "Belum selesai"}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
