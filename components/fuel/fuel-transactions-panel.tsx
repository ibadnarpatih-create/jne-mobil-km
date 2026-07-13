"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Eye, MapPin, Search, ShieldCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { loadFuelTransactions, reviewFuelTransaction, type FuelTransactionRecord } from "@/lib/fuel/admin";
import { formatRupiah } from "@/lib/fuel/formatters";
import { loadFuelMasterData } from "@/lib/fuel/repository";
import type { FuelMasterData } from "@/lib/fuel/types";
import { useDemoStore } from "@/lib/demo-store";
import { formatDate, formatKm } from "@/lib/utils";

export function FuelTransactionsPanel({ mode }: { mode: "transactions" | "validation" | "report" }) {
  const { users, vehicles } = useDemoStore();
  const [items, setItems] = useState<FuelTransactionRecord[]>([]);
  const [master, setMaster] = useState<FuelMasterData>({ fuelTypes: [], fuelPrices: [], fuelStations: [] });
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [selected, setSelected] = useState<FuelTransactionRecord | null>(null);
  const [search, setSearch] = useState(""); const [status, setStatus] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const reload = async () => { setLoading(true); setError(""); try { const [transactions, masters] = await Promise.all([loadFuelTransactions(), loadFuelMasterData()]); setItems(transactions); setMaster(masters); } catch (cause) { setError(cause instanceof Error ? cause.message : "Transaksi BBM gagal dimuat."); } finally { setLoading(false); } };
  useEffect(() => { void reload(); }, []);
  useEffect(() => {
    const syncSelected = () => {
      const id = new URLSearchParams(window.location.search).get("transaction");
      setSelected(id ? items.find((item) => item.id === id) ?? null : null);
    };
    syncSelected();
    window.addEventListener("popstate", syncSelected);
    return () => window.removeEventListener("popstate", syncSelected);
  }, [items]);
  const openDetail = (item: FuelTransactionRecord) => {
    const url = new URL(window.location.href);
    url.searchParams.set("transaction", item.id);
    window.history.pushState(
      { ...(window.history.state ?? {}) },
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    setSelected(item);
  };
  const closeDetail = () => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("transaction")) window.history.back();
    else setSelected(null);
  };
  const filtered = useMemo(() => items.filter((item) => {
    if (mode === "validation" && !["SUBMITTED", "NEED_REVIEW"].includes(item.status)) return false;
    if (status && item.status !== status) return false;
    if (from && item.transactionDate < from) return false; if (to && item.transactionDate > to) return false;
    const vehicle = vehicles.find((value) => value.id === item.vehicleId); const driver = users.find((value) => value.id === item.driverId);
    return [vehicle?.plate, vehicle?.code, driver?.name, master.fuelTypes.find((value) => value.id === item.fuelTypeId)?.name].join(" ").toLowerCase().includes(search.toLowerCase());
  }), [from, items, master.fuelTypes, mode, search, status, to, users, vehicles]);
  const title = mode === "validation" ? "Validasi BBM" : mode === "report" ? "Laporan BBM" : "Transaksi BBM";
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-extrabold">{title}</h2><p className="mt-1 text-sm text-slate-500">{mode === "validation" ? `${filtered.length} transaksi menunggu pemeriksaan` : "Data pengisian terhubung dengan kendaraan dan odometer."}</p></div>{mode === "report" && <div className="flex gap-2"><Button variant="outline" onClick={() => exportCsv(filtered, users, vehicles, master)}><Download className="h-4 w-4" /> CSV</Button><Button onClick={() => exportExcel(filtered, users, vehicles, master)}><Download className="h-4 w-4" /> Excel</Button></div>}</div>
    <Card><CardContent className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-4"><div className="relative"><Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" /><Input className="pl-12" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari plat, driver..." /></div><Select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Semua status</option>{["SUBMITTED","VERIFIED","NEED_REVIEW","REJECTED"].map((value) => <option key={value}>{value}</option>)}</Select><Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} title="Tanggal mulai" /><Input type="date" value={to} onChange={(event) => setTo(event.target.value)} title="Tanggal akhir" /></CardContent></Card>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
    {loading ? <Card><CardContent className="py-12 text-center text-sm text-slate-500">Memuat transaksi BBM...</CardContent></Card> : !filtered.length ? <Card><CardContent className="py-12 text-center text-sm text-slate-500">Belum ada transaksi BBM sesuai filter.</CardContent></Card> : <TransactionTable items={filtered} users={users} vehicles={vehicles} master={master} onDetail={openDetail} />}
    {selected && <TransactionDetail item={selected} users={users} vehicles={vehicles} master={master} allowReview={mode === "validation"} onClose={closeDetail} onReviewed={async () => { closeDetail(); await reload(); }} />}
  </div>;
}

function TransactionTable({ items, users, vehicles, master, onDetail }: { items: FuelTransactionRecord[]; users: ReturnType<typeof useDemoStore>["users"]; vehicles: ReturnType<typeof useDemoStore>["vehicles"]; master: FuelMasterData; onDetail: (item: FuelTransactionRecord) => void }) {
  return <Card className="overflow-hidden"><div className="max-h-[65dvh] overflow-auto"><table className="w-full min-w-[1150px] text-left text-sm"><thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-500"><tr>{["Tanggal","Kendaraan","Driver","KM Pengisian","Jarak","Estimasi Liter","Jenis BBM","Estimasi","Real Payment","Selisih","Status","Aksi"].map((label) => <th key={label} className="px-4 py-3 font-bold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{items.map((item) => { const vehicle = vehicles.find((value) => value.id === item.vehicleId); return <tr key={item.id} className="hover:bg-slate-50"><td className="px-4 py-4">{formatDate(item.transactionDate)}<span className="block text-xs text-slate-400">{item.transactionTime}</span></td><td className="px-4 py-4 font-bold">{vehicle?.plate}<span className="block text-xs font-normal text-slate-500">{vehicle?.code}</span></td><td className="px-4 py-4">{users.find((value) => value.id === item.driverId)?.name}</td><td className="px-4 py-4 font-bold">{formatKm(item.odometerAtRefuel)}</td><td className="px-4 py-4">{formatKm(item.totalDistance)} KM</td><td className="px-4 py-4">{item.estimatedLiters.toLocaleString("id-ID")} L</td><td className="px-4 py-4">{master.fuelTypes.find((value) => value.id === item.fuelTypeId)?.name}</td><td className="px-4 py-4">{formatRupiah(item.estimatedAmount)}</td><td className="px-4 py-4 font-bold">{formatRupiah(item.realPayment)}</td><td className={`px-4 py-4 font-bold ${Math.abs(item.paymentDifference) > 0 ? "text-amber-700" : "text-emerald-700"}`}>{formatRupiah(item.paymentDifference)}</td><td className="px-4 py-4"><Badge>{item.status}</Badge></td><td className="px-4 py-4"><Button size="sm" variant="outline" onClick={() => onDetail(item)}><Eye className="h-4 w-4" /> Detail</Button></td></tr>; })}</tbody></table></div></Card>;
}

function TransactionDetail({ item, users, vehicles, master, allowReview, onClose, onReviewed }: { item: FuelTransactionRecord; users: ReturnType<typeof useDemoStore>["users"]; vehicles: ReturnType<typeof useDemoStore>["vehicles"]; master: FuelMasterData; allowReview: boolean; onClose: () => void; onReviewed: () => Promise<void> }) {
  const [notes, setNotes] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const vehicle = vehicles.find((value) => value.id === item.vehicleId); const driver = users.find((value) => value.id === item.driverId);
  const act = async (action: "VERIFY" | "REJECT" | "NEED_REVIEW") => { if (action === "REJECT" && !notes.trim()) return setError("Alasan penolakan wajib diisi."); setBusy(true); setError(""); try { await reviewFuelTransaction(item.id, action, notes); await onReviewed(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Validasi belum berhasil."); } finally { setBusy(false); } };
  const photos = [["KM sebelum",item.kmBeforePhoto],["KM setelah",item.kmAfterPhoto],["Dispenser SPBU",item.dispenserPhoto],["Struk",item.receiptPhoto]];
  return <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/50 p-0 sm:p-5"><div className="mx-auto min-h-dvh w-full max-w-4xl bg-white p-5 sm:min-h-0 sm:rounded-2xl sm:p-7"><div className="flex items-start justify-between"><div><h3 className="text-xl font-extrabold">Detail Transaksi BBM</h3><p className="mt-1 text-sm text-slate-500">{vehicle?.plate} · {driver?.name}</p></div><button onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100"><X /></button></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><Info label="Tanggal" value={`${formatDate(item.transactionDate)} · ${item.transactionTime}`} /><Info label="Odometer sebelumnya" value={item.previousOdometer == null ? "Pengisian awal" : formatKm(item.previousOdometer)} /><Info label="KM saat pengisian" value={formatKm(item.odometerAtRefuel)} /><Info label="Total jarak" value={`${formatKm(item.totalDistance)} KM`} /><Info label="Estimasi liter" value={`${item.estimatedLiters.toLocaleString("id-ID")} L`} /><Info label="Standar konsumsi" value="8 KM/L" /><Info label="Jenis BBM" value={master.fuelTypes.find((value) => value.id === item.fuelTypeId)?.name ?? "—"} /><Info label="Estimasi nominal" value={formatRupiah(item.estimatedAmount)} /><Info label="Real payment" value={formatRupiah(item.realPayment)} /><Info label="Selisih" value={formatRupiah(item.paymentDifference)} /><Info label="SPBU" value={master.fuelStations.find((value) => value.id === item.fuelStationId)?.name ?? item.fuelStationName ?? "—"} /><Info label="Status" value={item.status} /></div>{item.latitude != null && item.longitude != null && <a href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-700"><MapPin className="h-5 w-5" /> Buka titik foto di Google Maps <ExternalLink className="h-4 w-4" /></a>}<div className="mt-6 grid gap-4 sm:grid-cols-2">{photos.map(([label,url]) => <div key={label}><p className="mb-2 text-sm font-bold">Foto {label}</p>{url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Foto ${label}`} className="h-56 w-full rounded-xl bg-slate-100 object-cover" /></a> : <div className="grid h-56 place-items-center rounded-xl bg-slate-100 text-sm text-slate-400">Foto tidak tersedia</div>}</div>)}</div>{item.notes && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm"><strong>Catatan:</strong> {item.notes}</p>}{item.rejectionReason && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"><strong>Alasan penolakan:</strong> {item.rejectionReason}</p>}{allowReview && <div className="mt-6 border-t pt-5"><Label>Catatan admin / alasan penolakan</Label><Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Isi catatan pemeriksaan" />{error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}<div className="mt-4 grid gap-2 sm:grid-cols-3"><Button disabled={busy} variant="outline" onClick={() => act("NEED_REVIEW")}>Perlu Review</Button><Button disabled={busy} variant="danger" onClick={() => act("REJECT")}>Tolak</Button><Button disabled={busy} onClick={() => act("VERIFY")}><ShieldCheck className="h-4 w-4" /> Verifikasi</Button></div></div>}</div></div>;
}
const Info = ({ label, value }: { label: string; value: string }) => <div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 font-bold">{value}</p></div>;

function rows(items: FuelTransactionRecord[], users: ReturnType<typeof useDemoStore>["users"], vehicles: ReturnType<typeof useDemoStore>["vehicles"], master: FuelMasterData) { return items.map((item, index) => { const vehicle = vehicles.find((value) => value.id === item.vehicleId); return { NO: index + 1, "NO PLAT": vehicle?.plate ?? "", "NO KENDARAAN": vehicle?.code ?? "", "JENIS KENDARAAN": vehicle?.type ?? "", DRIVER: users.find((value) => value.id === item.driverId)?.name ?? "", "KM PENGISIAN LALU": item.previousOdometer ?? 0, "KM SAAT PENGISIAN": item.odometerAtRefuel, "TOTAL JARAK TEMPUH": item.totalDistance, "ESTIMASI LITER": item.estimatedLiters, "STANDAR KM/L": 8, "HARGA BBM": item.pricePerLiter, "ESTIMASI NOMINAL": item.estimatedAmount, "REAL PAYMENT": item.realPayment, SELISIH: item.paymentDifference, "JENIS BBM": master.fuelTypes.find((value) => value.id === item.fuelTypeId)?.name ?? "", SPBU: master.fuelStations.find((value) => value.id === item.fuelStationId)?.name ?? item.fuelStationName ?? "", TANGGAL: item.transactionDate, STATUS: item.status }; }); }
function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
function exportCsv(items: FuelTransactionRecord[], users: ReturnType<typeof useDemoStore>["users"], vehicles: ReturnType<typeof useDemoStore>["vehicles"], master: FuelMasterData) { const values = rows(items, users, vehicles, master); if (!values.length) return; const headers = Object.keys(values[0]); const csv = [headers, ...values.map((row) => headers.map((header) => row[header as keyof typeof row]))].map((line) => line.map((value) => `"${String(value).replaceAll('"','""')}"`).join(",")).join("\r\n"); download(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }), `laporan-bbm-${new Date().toISOString().slice(0,10)}.csv`); }
async function exportExcel(items: FuelTransactionRecord[], users: ReturnType<typeof useDemoStore>["users"], vehicles: ReturnType<typeof useDemoStore>["vehicles"], master: FuelMasterData) { if (!items.length) return; const XLSX = await import("xlsx"); const sheet = XLSX.utils.json_to_sheet(rows(items, users, vehicles, master)); const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Laporan BBM"); XLSX.writeFile(book, `laporan-bbm-${new Date().toISOString().slice(0,10)}.xlsx`); }
