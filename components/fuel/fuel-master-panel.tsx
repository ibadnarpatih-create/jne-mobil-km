"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleAlert, Fuel, Pencil, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { formatDate } from "@/lib/utils";
import { formatRupiah, normalizeFuelCode } from "@/lib/fuel/formatters";
import {
  loadFuelMasterData,
  newFuelMasterId,
  saveFuelPrice,
  saveFuelStation,
  saveFuelType,
} from "@/lib/fuel/repository";
import type { FuelMasterData, FuelPrice, FuelStation, FuelType } from "@/lib/fuel/types";

export type FuelMasterSection = "types" | "prices" | "stations";

export function FuelMasterPanel({ section }: { section: FuelMasterSection }) {
  const [data, setData] = useState<FuelMasterData>({ fuelTypes: [], fuelPrices: [], fuelStations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<FuelType | FuelPrice | FuelStation | null>(null);
  const reload = async () => {
    setLoading(true); setError("");
    try { setData(await loadFuelMasterData()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Data master BBM gagal dimuat."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, []);
  const title = section === "types" ? "Jenis BBM" : section === "prices" ? "Riwayat Harga BBM" : "SPBU / Vendor";
  const description = section === "types"
    ? "Daftar bahan bakar yang dapat digunakan pada transaksi."
    : section === "prices"
      ? "Harga aktif berdasarkan jenis BBM dan tanggal transaksi."
      : "Daftar lokasi pengisian yang dapat dipilih pengguna.";
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-2xl font-extrabold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>
        <Button onClick={() => setEditing(createEmpty(section))}><Plus className="h-4 w-4" /> Tambah {section === "stations" ? "SPBU" : section === "prices" ? "Harga" : "Jenis"}</Button>
      </div>
      <div className="relative max-w-lg"><Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-12" placeholder={`Cari ${title.toLowerCase()}...`} /></div>
      {error && <div role="alert" className="flex gap-2 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700"><CircleAlert className="h-5 w-5 shrink-0" />{error}</div>}
      {loading ? <Card><CardContent className="py-12 text-center text-sm text-slate-500">Memuat data BBM...</CardContent></Card>
        : <MasterTable section={section} data={data} query={query} onEdit={setEditing} />}
      {editing && <FuelMasterModal section={section} value={editing} data={data} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await reload(); }} />}
    </div>
  );
}

function MasterTable({ section, data, query, onEdit }: { section: FuelMasterSection; data: FuelMasterData; query: string; onEdit: (value: FuelType | FuelPrice | FuelStation) => void }) {
  const needle = query.trim().toLowerCase();
  const rows = useMemo(() => {
    if (section === "types") return data.fuelTypes.filter((item) => [item.name, item.code, item.description].join(" ").toLowerCase().includes(needle));
    if (section === "prices") return data.fuelPrices.filter((item) => `${data.fuelTypes.find((type) => type.id === item.fuelTypeId)?.name} ${item.pricePerLiter}`.toLowerCase().includes(needle));
    return data.fuelStations.filter((item) => [item.name, item.code, item.address].join(" ").toLowerCase().includes(needle));
  }, [data, needle, section]);
  if (!rows.length) return <Card><CardContent className="py-12 text-center"><Fuel className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm text-slate-500">Belum ada data yang cocok.</p></CardContent></Card>;
  return <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{section === "types" ? <><Th>Kode</Th><Th>Nama</Th><Th>Deskripsi</Th></> : section === "prices" ? <><Th>Jenis BBM</Th><Th>Harga / Liter</Th><Th>Mulai</Th><Th>Selesai</Th></> : <><Th>Kode</Th><Th>Nama</Th><Th>Alamat</Th></>}<Th>Status</Th><Th>Aksi</Th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} className="hover:bg-slate-50/70">{section === "types" ? <TypeCells value={row as FuelType} /> : section === "prices" ? <PriceCells value={row as FuelPrice} types={data.fuelTypes} /> : <StationCells value={row as FuelStation} />}<td className="px-5 py-4"><Badge>{row.isActive ? "Aktif" : "Nonaktif"}</Badge></td><td className="px-5 py-4"><Button variant="outline" size="sm" onClick={() => onEdit(row)}><Pencil className="h-3.5 w-3.5" /> Edit</Button></td></tr>)}</tbody></table></div></Card>;
}
const Th = ({ children }: { children: React.ReactNode }) => <th className="px-5 py-3 font-bold">{children}</th>;
const TypeCells = ({ value }: { value: FuelType }) => <><td className="px-5 py-4 font-mono text-xs font-bold text-jne-blue">{value.code}</td><td className="px-5 py-4 font-bold">{value.name}</td><td className="max-w-xs px-5 py-4 text-slate-500">{value.description || "—"}</td></>;
const PriceCells = ({ value, types }: { value: FuelPrice; types: FuelType[] }) => <><td className="px-5 py-4 font-bold">{types.find((type) => type.id === value.fuelTypeId)?.name ?? "Jenis dihapus"}</td><td className="px-5 py-4 font-extrabold text-jne-blue">{formatRupiah(value.pricePerLiter)}</td><td className="px-5 py-4">{formatDate(value.effectiveStartDate)}</td><td className="px-5 py-4">{value.effectiveEndDate ? formatDate(value.effectiveEndDate) : "Seterusnya"}</td></>;
const StationCells = ({ value }: { value: FuelStation }) => <><td className="px-5 py-4 font-mono text-xs font-bold text-jne-blue">{value.code}</td><td className="px-5 py-4 font-bold">{value.name}</td><td className="max-w-sm px-5 py-4 text-slate-500">{value.address || "—"}</td></>;

function FuelMasterModal({ section, value, data, onClose, onSaved }: { section: FuelMasterSection; value: FuelType | FuelPrice | FuelStation; data: FuelMasterData; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setError(""); setBusy(true);
    try {
      if (section === "types") { const item = form as FuelType; if (!item.name.trim() || !item.code) throw new Error("Nama dan kode jenis BBM wajib diisi."); await saveFuelType(item); }
      else if (section === "prices") { const item = form as FuelPrice; if (!item.fuelTypeId || item.pricePerLiter <= 0 || !item.effectiveStartDate) throw new Error("Jenis BBM, harga, dan tanggal mulai wajib diisi."); if (item.effectiveEndDate && item.effectiveEndDate < item.effectiveStartDate) throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai."); await saveFuelPrice(item); }
      else { const item = form as FuelStation; if (!item.name.trim() || !item.code) throw new Error("Nama dan kode SPBU wajib diisi."); await saveFuelStation(item); }
      await onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Data belum berhasil disimpan."); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[70] grid place-items-end bg-slate-950/40 p-0 sm:place-items-center sm:p-5"><div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-6"><div className="mb-5"><h3 className="text-xl font-extrabold">{value.id ? "Form Master BBM" : "Tambah Master BBM"}</h3><p className="mt-1 text-sm text-slate-500">Perubahan tersimpan ke database pada mode produksi.</p></div>{section === "types" ? <FuelTypeFields value={form as FuelType} onChange={setForm} /> : section === "prices" ? <FuelPriceFields value={form as FuelPrice} types={data.fuelTypes} onChange={setForm} /> : <FuelStationFields value={form as FuelStation} onChange={setForm} />}{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}<div className="mt-6 flex gap-3"><Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>Batal</Button><Button className="flex-1" onClick={submit} disabled={busy}>{busy ? "Menyimpan..." : "Simpan"}</Button></div></div></div>;
}
function FuelTypeFields({ value, onChange }: { value: FuelType; onChange: (value: FuelType) => void }) { return <div className="space-y-4"><div><Label>Nama</Label><Input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value, code: value.code || normalizeFuelCode(event.target.value) })} placeholder="Pertamax" /></div><div><Label>Kode</Label><Input value={value.code} onChange={(event) => onChange({ ...value, code: normalizeFuelCode(event.target.value) })} placeholder="PERTAMAX" /></div><div><Label>Deskripsi</Label><Input value={value.description ?? ""} onChange={(event) => onChange({ ...value, description: event.target.value })} /></div><ActiveField value={value.isActive} onChange={(isActive) => onChange({ ...value, isActive })} /></div>; }
function FuelPriceFields({ value, types, onChange }: { value: FuelPrice; types: FuelType[]; onChange: (value: FuelPrice) => void }) { return <div className="space-y-4"><div><Label>Jenis BBM</Label><Select value={value.fuelTypeId} onChange={(event) => onChange({ ...value, fuelTypeId: event.target.value })}><option value="">Pilih jenis BBM</option>{types.filter((item) => item.isActive || item.id === value.fuelTypeId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div><div><Label>Harga per liter</Label><Input type="number" inputMode="numeric" min="1" value={value.pricePerLiter || ""} onChange={(event) => onChange({ ...value, pricePerLiter: Number(event.target.value) })} placeholder="10000" /></div><div className="grid grid-cols-2 gap-3"><div><Label>Mulai berlaku</Label><Input type="date" value={value.effectiveStartDate} onChange={(event) => onChange({ ...value, effectiveStartDate: event.target.value })} /></div><div><Label>Selesai (opsional)</Label><Input type="date" value={value.effectiveEndDate ?? ""} onChange={(event) => onChange({ ...value, effectiveEndDate: event.target.value || undefined })} /></div></div><ActiveField value={value.isActive} onChange={(isActive) => onChange({ ...value, isActive })} /></div>; }
function FuelStationFields({ value, onChange }: { value: FuelStation; onChange: (value: FuelStation) => void }) { return <div className="space-y-4"><div><Label>Nama SPBU / vendor</Label><Input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value, code: value.code || normalizeFuelCode(event.target.value) })} /></div><div><Label>Kode</Label><Input value={value.code} onChange={(event) => onChange({ ...value, code: normalizeFuelCode(event.target.value) })} /></div><div><Label>Alamat</Label><Input value={value.address ?? ""} onChange={(event) => onChange({ ...value, address: event.target.value })} /></div><div className="grid grid-cols-2 gap-3"><div><Label>Latitude</Label><Input type="number" step="any" value={value.latitude ?? ""} onChange={(event) => onChange({ ...value, latitude: event.target.value ? Number(event.target.value) : undefined })} /></div><div><Label>Longitude</Label><Input type="number" step="any" value={value.longitude ?? ""} onChange={(event) => onChange({ ...value, longitude: event.target.value ? Number(event.target.value) : undefined })} /></div></div><ActiveField value={value.isActive} onChange={(isActive) => onChange({ ...value, isActive })} /></div>; }
const ActiveField = ({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) => <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-jne-blue" checked={value} onChange={(event) => onChange(event.target.checked)} /> Data aktif dan dapat dipilih</label>;
function createEmpty(section: FuelMasterSection): FuelType | FuelPrice | FuelStation {
  if (section === "types") return { id: newFuelMasterId(), name: "", code: "", isActive: true };
  if (section === "prices") return { id: newFuelMasterId(), fuelTypeId: "", pricePerLiter: 0, effectiveStartDate: new Date().toISOString().slice(0, 10), isActive: true };
  return { id: newFuelMasterId(), name: "", code: "", isActive: true };
}
