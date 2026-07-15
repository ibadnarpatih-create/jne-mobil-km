"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, ChevronLeft, Fuel, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { formatRupiah } from "@/lib/fuel/formatters";
import { loadFuelMasterData } from "@/lib/fuel/repository";
import { loadPreviousFuelTransaction, submitFuelTransaction, type PreviousFuelTransaction } from "@/lib/fuel/transactions";
import type { FuelMasterData } from "@/lib/fuel/types";
import { compressImage } from "@/lib/image";
import type { User, Vehicle, VehicleLog } from "@/lib/types";
import { formatKm, jakartaNow } from "@/lib/utils";

export function FuelInputScreen({ user, vehicles, logs, onBack, onSuccess, onDirtyChange }: {
  user: User; vehicles: Vehicle[]; logs: VehicleLog[]; onBack: () => void; onSuccess: () => void; onDirtyChange: (dirty: boolean) => void;
}) {
  const now = jakartaNow();
  const myTrips = useMemo(() => logs.filter((log) => log.driverId === user.id), [logs, user.id]);
  const [master, setMaster] = useState<FuelMasterData>({ fuelTypes: [], fuelPrices: [], fuelStations: [] });
  const [date, setDate] = useState(now.date);
  const [time, setTime] = useState(now.time);
  const [vehicleId, setVehicleId] = useState(user.vehicleId ?? myTrips[0]?.vehicleId ?? "");
  const [fuelTypeId, setFuelTypeId] = useState("");
  const [realPayment, setRealPayment] = useState("");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [kmBeforePhoto, setKmBeforePhoto] = useState("");
  const [kmAfterPhoto, setKmAfterPhoto] = useState("");
  const [dispenserPhoto, setDispenserPhoto] = useState("");
  const [receiptPhoto, setReceiptPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [previousFuel, setPreviousFuel] = useState<PreviousFuelTransaction | null>(null);
  const vehicle = vehicles.find((item) => item.id === vehicleId);
  const availableTrips = myTrips.filter((log) => log.vehicleId === vehicleId && log.date === date);
  const automaticallyMatchedTrips = availableTrips.filter((trip) => {
    const km = Number(odometer);
    if (!km) return false;
    return km >= trip.startKm && (trip.endKm == null || km <= trip.endKm);
  });
  const refuelDistance = previousFuel && Number(odometer) >= previousFuel.odometer ? Number(odometer) - previousFuel.odometer : 0;
  const activePrice = master.fuelPrices.find((price) => price.fuelTypeId === fuelTypeId && price.isActive && price.effectiveStartDate <= date && (!price.effectiveEndDate || price.effectiveEndDate >= date));
  const estimatedLiters = Math.round((refuelDistance / 8) * 100) / 100;
  const estimatedAmount = Math.round(estimatedLiters * (activePrice?.pricePerLiter ?? 0));
  const paymentDifference = Number(realPayment) - estimatedAmount;

  useEffect(() => { loadFuelMasterData().then(setMaster).catch((cause) => setError(cause instanceof Error ? cause.message : "Master BBM gagal dimuat.")); }, []);
  useEffect(() => {
    loadPreviousFuelTransaction(vehicleId, date).then(setPreviousFuel).catch(() => setPreviousFuel(null));
  }, [vehicleId, date]);
  useEffect(() => {
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(
      (position) => setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => undefined, { timeout: 5000 },
    );
  }, []);
  useEffect(() => {
    const dirty = Boolean(fuelTypeId || realPayment || odometer || notes || kmBeforePhoto || kmAfterPhoto || dispenserPhoto || receiptPhoto);
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dispenserPhoto, fuelTypeId, kmAfterPhoto, kmBeforePhoto, notes, odometer, onDirtyChange, realPayment, receiptPhoto]);
  const refreshCoordinates = () => {
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(
      (position) => setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => undefined, { enableHighAccuracy: true, timeout: 8000 },
    );
  };
  const submit = async () => {
    setError("");
    if (!vehicle) return setError("Pilih kendaraan terlebih dahulu.");
    if (!fuelTypeId || !activePrice) return setError("Harga aktif untuk jenis BBM dan tanggal tersebut belum tersedia.");
    if (Number(realPayment) < 0 || realPayment === "") return setError("Real payment wajib diisi dan tidak boleh negatif.");
    if (Number(odometer) <= 0) return setError("KM saat pengisian wajib diisi.");
    if (previousFuel && Number(odometer) < previousFuel.odometer) return setError(`KM tidak boleh lebih kecil dari pengisian sebelumnya (${formatKm(previousFuel.odometer)}).`);
    if (!kmBeforePhoto || !kmAfterPhoto || !dispenserPhoto || !receiptPhoto) return setError("Empat foto bukti pengisian wajib diambil.");
    if (!window.confirm("Kirim transaksi BBM untuk diperiksa admin? Data perjalanan tidak dapat diganti setelah dikirim.")) return;
    setBusy(true);
    try {
      await submitFuelTransaction({ driverId: user.id, vehicleId, tripIds: automaticallyMatchedTrips.map((trip) => trip.id), transactionDate: date, transactionTime: time, odometerAtRefuel: Number(odometer), fuelTypeId, realPayment: Number(realPayment), latitude: coordinates?.latitude, longitude: coordinates?.longitude, kmBeforePhoto, kmAfterPhoto, dispenserPhoto, receiptPhoto, notes });
      onSuccess();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Transaksi BBM belum berhasil dikirim."); }
    finally { setBusy(false); }
  };
  return <div><ScreenHeader onBack={onBack} /><div className="space-y-5 p-5">
    <Card><CardHeader><h2 className="font-extrabold">Data operasional</h2><p className="text-xs text-slate-500">Perjalanan dicocokkan otomatis dari kendaraan, waktu, dan odometer.</p></CardHeader><CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-3"><div><Label>Tanggal</Label><Input type="date" value={date} max={now.date} onChange={(event) => setDate(event.target.value)} /></div><div><Label>Jam</Label><Input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div></div>
      <div><Label>Kendaraan</Label><Select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}><option value="">Pilih kendaraan</option>{vehicles.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.plate} — {item.code}</option>)}</Select></div>
      <div className="rounded-xl bg-teal-50 p-4 text-sm text-teal-800"><strong>Pencocokan perjalanan otomatis</strong><p className="mt-1 text-xs leading-5">Isi KM saat pengisian. Sistem akan mencari perjalanan yang sesuai; jika belum ada, transaksi tetap disimpan dan dapat dicocokkan setelah perjalanan selesai.</p></div>
      {vehicle && <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm"><ReadOnly label="Driver" value={user.name} /><ReadOnly label="Nomor Polisi" value={vehicle.plate} /><ReadOnly label="Kode" value={vehicle.code} /><ReadOnly label="Jenis" value={vehicle.type} /></div>}
    </CardContent></Card>
    <Card><CardHeader><h2 className="font-extrabold">Data BBM</h2></CardHeader><CardContent className="space-y-4">
      <div><Label>Jenis BBM</Label><Select value={fuelTypeId} onChange={(event) => setFuelTypeId(event.target.value)}><option value="">Pilih jenis BBM</option>{master.fuelTypes.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div>
      <ReadOnly label="Harga BBM aktif" value={activePrice ? formatRupiah(activePrice.pricePerLiter) : "Belum tersedia"} />
      <div><Label>Real payment</Label><Input type="number" inputMode="numeric" min="0" value={realPayment} onChange={(event) => setRealPayment(event.target.value)} placeholder="248700" /></div>
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-teal-50 p-4"><ReadOnly label="Jarak sejak isi terakhir" value={previousFuel ? `${formatKm(refuelDistance)} KM` : "Pengisian awal"} /><ReadOnly label="Estimasi liter (÷ 8)" value={`${estimatedLiters.toLocaleString("id-ID")} L`} /><ReadOnly label="Estimasi nominal" value={formatRupiah(estimatedAmount)} /><ReadOnly label="Selisih real payment" value={formatRupiah(paymentDifference)} /></div>
    </CardContent></Card>
    <Card><CardHeader><h2 className="font-extrabold">Data pendukung</h2></CardHeader><CardContent className="space-y-4">
      <div><Label>KM saat pengisian</Label><Input type="number" inputMode="numeric" value={odometer} min={previousFuel?.odometer ?? 0} onChange={(event) => setOdometer(event.target.value.replace(/\D/g, ""))} />{previousFuel && <p className="mt-2 text-xs text-slate-500">Pengisian sebelumnya: {formatKm(previousFuel.odometer)} KM pada {previousFuel.date}</p>}</div>
      <PhotoField label="Foto KM sebelum pengisian" value={kmBeforePhoto} onChange={setKmBeforePhoto} onCaptureLocation={refreshCoordinates} />
      <PhotoField label="Foto KM setelah pengisian" value={kmAfterPhoto} onChange={setKmAfterPhoto} onCaptureLocation={refreshCoordinates} />
      <PhotoField label="Foto dispenser SPBU setelah pengisian" value={dispenserPhoto} onChange={setDispenserPhoto} onCaptureLocation={refreshCoordinates} />
      <PhotoField label="Foto struk" value={receiptPhoto} onChange={setReceiptPhoto} onCaptureLocation={refreshCoordinates} />
      <div><Label>Catatan</Label><Input value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
      {coordinates ? <a className="flex items-center gap-2 text-xs font-semibold text-emerald-700 underline" href={`https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`} target="_blank" rel="noreferrer"><MapPin className="h-4 w-4" /> Geotag tersimpan · Lihat titik di Maps</a> : <p className="text-xs text-amber-700">Aktifkan izin lokasi agar titik foto dapat diverifikasi admin.</p>}
    </CardContent></Card>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
    <Button size="lg" className="w-full" disabled={busy} onClick={submit}>{busy ? "Mengunggah dan mengirim..." : "Kirim Transaksi BBM"}</Button>
  </div></div>;
}
const ScreenHeader = ({ onBack }: { onBack: () => void }) => <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-4"><button onClick={onBack} className="rounded-xl p-2 text-slate-600"><ChevronLeft /></button><div><h1 className="font-extrabold">Input BBM</h1><p className="text-xs text-slate-500">Terintegrasi otomatis dengan data perjalanan</p></div></div>;
const ReadOnly = ({ label, value }: { label: string; value: string }) => <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-900">{value}</p></div>;
function PhotoField({ label, value, onChange, onCaptureLocation }: { label: string; value: string; onChange: (value: string) => void; onCaptureLocation: () => void }) {
  const ref = useRef<HTMLInputElement>(null); const [processing, setProcessing] = useState(false);
  return <div><Label>{label} <span className="text-jne-red">*</span></Label><input ref={ref} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; onCaptureLocation(); setProcessing(true); try { onChange(await compressImage(file)); } finally { setProcessing(false); } }} />{value ? <div><div className="relative overflow-hidden rounded-xl bg-slate-100"><img src={value} alt={label} className="h-44 w-full object-cover" /><CheckCircle2 className="absolute right-3 top-3 h-7 w-7 rounded-full bg-white text-emerald-500" /></div><Button type="button" variant="outline" className="mt-2 w-full" onClick={() => ref.current?.click()}>Ambil ulang</Button></div> : <button type="button" onClick={() => ref.current?.click()} className="flex min-h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50"><Camera className="mb-2 h-7 w-7 text-jne-blue" /><strong className="text-sm">{processing ? "Memproses..." : "Buka Kamera"}</strong></button>}</div>;
}

export function FuelSubmitSuccess({ onDone }: { onDone: () => void }) { return <div className="p-5 pt-12 text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-11 w-11" /></span><h1 className="mt-5 text-2xl font-extrabold">Transaksi BBM terkirim</h1><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Data berstatus SUBMITTED dan menunggu pemeriksaan admin.</p><Button size="lg" className="mt-7 w-full" onClick={onDone}><Fuel className="h-5 w-5" /> Kembali ke Beranda</Button></div>; }
