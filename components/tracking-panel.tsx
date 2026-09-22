"use client";

import { useEffect, useState } from "react";
import { useDemoStore } from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/client";

type Position = { log_id: string; latitude: number; longitude: number; accuracy: number; recorded_at: string; trip: { jam_akhir: string | null; driver: { nama: string } | null; vehicle: { plat_nomor: string } | null } | null };

export function TrackingPanel() {
  const store = useDemoStore();
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [selected, setSelected] = useState("");
  useEffect(() => {
    const client = createClient();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        if (!store.isRemote || !client) { setLoading(false); return; }
        const { data, error } = await client.from("tracking_latest").select("log_id,latitude,longitude,accuracy,recorded_at,trip:vehicle_logs(jam_akhir,driver:users(nama),vehicle:vehicles(plat_nomor))").order("recorded_at", { ascending: false }).limit(200);
        if (cancelled) return;
        if (error) throw error;
        setPositions((data ?? []) as unknown as Position[]);
        setError("");
      } catch {
        if (!cancelled) setError("Posisi belum berhasil dimuat. Periksa koneksi dan pastikan migrasi tracking sudah dijalankan.");
      } finally {
        if (!cancelled) { setLoading(false); setNow(Date.now()); timer = setTimeout(refresh, 15000); }
      }
    }
    void refresh();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [store.isRemote]);
  const chosen = positions.find(p => p.log_id === selected);
  return <section className="space-y-5 rounded-3xl bg-slate-950 p-5 text-white sm:p-8">
    <div><p className="text-xs font-bold uppercase tracking-widest text-teal-300">Movetra • Tracking pilot</p><h2 className="mt-2 text-2xl font-extrabold">Posisi driver</h2><p className="mt-2 text-sm text-slate-300">Pembaruan setiap 15 detik. Lokasi lebih dari 2 menit ditandai terlambat.</p></div>
    {!store.isRemote && <p className="rounded-xl bg-slate-800 p-4 text-sm">Mode demo: belum ada lokasi GPS. Gunakan akun Supabase untuk uji tracking antarperangkat.</p>}
    {error && <p role="alert" className="rounded-xl bg-amber-950 p-4 text-amber-200">{error}</p>}
    {loading && <p role="status">Memuat posisi…</p>}
    {!loading && !error && positions.length === 0 && store.isRemote && <p className="rounded-xl bg-slate-800 p-6">Belum ada lokasi. Driver dapat mengaktifkan uji GPS saat perjalanan berlangsung.</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{positions.map(point => {
      const stale = now - Date.parse(point.recorded_at) > 120000;
      const finished = point.trip?.jam_akhir != null;
      return <button key={point.log_id} onClick={() => setSelected(point.log_id)} className={`rounded-2xl border p-4 text-left ${selected === point.log_id ? "border-teal-400 bg-slate-800" : "border-slate-700 bg-slate-900"}`}>
        <p className="font-bold">{point.trip?.driver?.nama ?? "Driver"}</p><p className="mt-1 text-sm text-slate-300">{point.trip?.vehicle?.plat_nomor ?? "Kendaraan"}</p>
        <p className={`mt-3 text-xs font-bold ${finished || stale || error ? "text-amber-300" : "text-teal-300"}`}>{finished ? "Perjalanan selesai" : error ? "Koneksi bermasalah" : stale ? "Pembaruan terlambat" : "Lokasi terbaru"}</p>
        <p className="mt-2 text-xs text-slate-400">{new Date(point.recorded_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB • ±{Math.round(point.accuracy)} m</p>
      </button>;
    })}</div>
    {chosen && <div className="rounded-2xl bg-slate-900 p-5"><p className="font-semibold">Koordinat lokasi terakhir</p><p className="mt-2 text-slate-300">{chosen.latitude.toFixed(6)}, {chosen.longitude.toFixed(6)}</p><a className="mt-4 inline-block rounded-xl bg-teal-400 px-4 py-2 font-bold text-slate-950" href={`https://www.google.com/maps?q=${chosen.latitude},${chosen.longitude}`} target="_blank" rel="noopener noreferrer">Buka di peta</a></div>}
  </section>;
}
