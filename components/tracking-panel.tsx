"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { useDemoStore } from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/client";

type Position = { log_id: string; latitude: number; longitude: number; accuracy: number; recorded_at: string; trip: { jam_akhir: string | null; driver: { nama: string } | null; vehicle: { plat_nomor: string } | null } | null };
type Status = "active" | "stale" | "finished";

const carSvg = (status: Status) => `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M11 21l3-8c.6-1.7 2.1-2.8 4-2.8h12c1.9 0 3.4 1.1 4 2.8l3 8h2c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2h-2v2.5c0 .8-.7 1.5-1.5 1.5h-3c-.8 0-1.5-.7-1.5-1.5V34H16v2.5c0 .8-.7 1.5-1.5 1.5h-3c-.8 0-1.5-.7-1.5-1.5V34H8c-1.1 0-2-.9-2-2v-9c0-1.1.9-2 2-2h3z" fill="${status === "active" ? "#0f766e" : status === "stale" ? "#d97706" : "#64748b"}" stroke="#fff" stroke-width="2"/><path d="M16 20h16l-2.3-6H18.3L16 20z" fill="#ccfbf1"/><circle cx="15" cy="28" r="2.5" fill="#fff"/><circle cx="33" cy="28" r="2.5" fill="#fff"/></svg>`;

export function TrackingPanel() {
  const store = useDemoStore();
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<{ map: import("leaflet").Map; layer: import("leaflet").LayerGroup } | null>(null);
  const getStatus = (point: Position): Status => point.trip?.jam_akhir ? "finished" : now - Date.parse(point.recorded_at) > 120000 ? "stale" : "active";
  const statusLabel = (status: Status) => status === "active" ? "Aktif" : status === "stale" ? "Terlambat" : "Selesai";

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
      } catch { if (!cancelled) setError("Posisi belum berhasil dimuat. Periksa koneksi dan migrasi tracking."); }
      finally { if (!cancelled) { setLoading(false); setNow(Date.now()); timer = setTimeout(refresh, 15000); } }
    }
    void refresh();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [store.isRemote]);

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
  const filtered = useMemo(() => positions.filter((point) => {
    const label = `${point.trip?.driver?.nama ?? ""} ${point.trip?.vehicle?.plat_nomor ?? ""}`.toLowerCase();
    const status = getStatus(point);
    return (!query || label.includes(query.toLowerCase())) && (statusFilter === "all" || status === statusFilter) && (!activeOnly || status === "active");
  }), [positions, query, statusFilter, activeOnly, now]);

  useEffect(() => {
    let cancelled = false;
    async function drawMap() {
      if (!mapRef.current) return;
      const L = await import("leaflet");
      if (cancelled || !mapRef.current) return;
      if (!leafletRef.current) {
        const map = L.map(mapRef.current, { zoomControl: true }).setView([-6.2, 106.816666], 10);
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { attribution: "© OpenStreetMap © CARTO", subdomains: "abcd", maxZoom: 20 }).addTo(map);
        leafletRef.current = { map, layer: L.layerGroup().addTo(map) };
      }
      const { map, layer } = leafletRef.current;
      layer.clearLayers();
      const bounds: [number, number][] = [];
      filtered.forEach((point) => {
        const status = getStatus(point);
        const name = point.trip?.driver?.nama ?? "Driver";
        const plate = point.trip?.vehicle?.plat_nomor ?? "Armada";
        const label = `${name} · ${plate}`;
        const icon = L.divIcon({ className: "movetra-car-marker", html: `<span class="movetra-car-icon">${carSvg(status)}</span><b>${label}</b>`, iconSize: [190, 42], iconAnchor: [18, 22] });
        L.marker([point.latitude, point.longitude], { icon }).on("click", () => setSelected(point.log_id)).bindPopup(`<strong>${label}</strong><br/>${statusLabel(status)}<br/>Akurasi ±${Math.round(point.accuracy)} m`).addTo(layer);
        bounds.push([point.latitude, point.longitude]);
      });
      if (bounds.length) map.fitBounds(bounds as import("leaflet").LatLngBoundsExpression, { padding: [30, 30], maxZoom: 13 });
    }
    void drawMap();
    return () => { cancelled = true; };
  }, [filtered]);
  useEffect(() => () => { leafletRef.current?.map.remove(); leafletRef.current = null; }, []);

  const chosen = filtered.find(p => p.log_id === selected) ?? positions.find(p => p.log_id === selected);
  const stats = { active: positions.filter(p => getStatus(p) === "active").length, stale: positions.filter(p => getStatus(p) === "stale").length, finished: positions.filter(p => getStatus(p) === "finished").length };
  return <section className="space-y-5 rounded-3xl bg-slate-950 p-5 text-white sm:p-8">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-widest text-teal-300">Movetra • Live fleet control</p><h2 className="mt-2 text-2xl font-extrabold">Posisi driver</h2><p className="mt-2 text-sm text-slate-300">Pantau armada secara real-time. Refresh otomatis setiap 15 detik.</p></div><p className="text-xs text-slate-400">Update terakhir: {now ? new Date(now).toLocaleTimeString("id-ID") : "-"}</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-teal-900 bg-teal-950/50 p-4"><p className="text-xs uppercase text-teal-300">Driver aktif</p><p className="mt-1 text-2xl font-extrabold">{stats.active}</p></div><div className="rounded-2xl border border-amber-900 bg-amber-950/40 p-4"><p className="text-xs uppercase text-amber-300">Terlambat</p><p className="mt-1 text-2xl font-extrabold">{stats.stale}</p></div><div className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><p className="text-xs uppercase text-slate-400">Perjalanan selesai</p><p className="mt-1 text-2xl font-extrabold">{stats.finished}</p></div></div>
    {!store.isRemote && <p className="rounded-xl bg-slate-800 p-4 text-sm">Mode demo: belum ada lokasi GPS. Gunakan akun Supabase untuk uji tracking antarperangkat.</p>}
    {error && <p role="alert" className="rounded-xl bg-amber-950 p-4 text-amber-200">{error}</p>}
    {loading && <p role="status">Memuat posisi…</p>}
    <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari driver atau nomor plat..." className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-teal-400" /><select value={statusFilter} onChange={e => setStatusFilter(e.target.value as "all" | Status)} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none"><option value="all">Semua status</option><option value="active">Aktif</option><option value="stale">Terlambat</option><option value="finished">Selesai</option></select><button onClick={() => setActiveOnly(!activeOnly)} className={`rounded-xl border px-4 py-3 text-sm font-bold ${activeOnly ? "border-teal-400 bg-teal-500 text-slate-950" : "border-slate-700 bg-slate-900 text-slate-200"}`}>{activeOnly ? "✓ Aktif saja" : "Tampilkan aktif"}</button></div>
    <div className="flex flex-wrap gap-3 text-xs text-slate-300"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-teal-400" />Aktif</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />Terlambat</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />Selesai</span><span className="ml-auto">Menampilkan {filtered.length} dari {positions.length} armada</span></div>
    {!loading && !error && positions.length === 0 && store.isRemote && <p className="rounded-xl bg-slate-800 p-6">Belum ada lokasi. Driver dapat mengaktifkan GPS saat perjalanan berlangsung.</p>}
    <div ref={mapRef} className="h-[420px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-800" />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(point => { const status = getStatus(point); return <button key={point.log_id} onClick={() => setSelected(point.log_id)} className={`rounded-2xl border p-4 text-left transition ${selected === point.log_id ? "border-teal-400 bg-slate-800 shadow-lg shadow-teal-950" : "border-slate-700 bg-slate-900 hover:border-slate-500"}`}><div className="flex items-start justify-between gap-2"><div><p className="font-bold">{point.trip?.driver?.nama ?? "Driver"}</p><p className="mt-1 text-sm text-slate-300">{point.trip?.vehicle?.plat_nomor ?? "Kendaraan"}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${status === "active" ? "bg-teal-950 text-teal-300" : status === "stale" ? "bg-amber-950 text-amber-300" : "bg-slate-800 text-slate-400"}`}>{statusLabel(status)}</span></div><p className="mt-3 text-xs text-slate-400">{new Date(point.recorded_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB • ±{Math.round(point.accuracy)} m</p></button>; })}</div>
    {chosen && <div className="grid gap-5 rounded-2xl border border-teal-900 bg-slate-900 p-5 md:grid-cols-[1fr_auto] md:items-center"><div><p className="text-xs font-bold uppercase tracking-widest text-teal-300">Detail armada terpilih</p><p className="mt-2 text-lg font-extrabold">{chosen.trip?.driver?.nama ?? "Driver"}</p><p className="text-slate-300">{chosen.trip?.vehicle?.plat_nomor ?? "Kendaraan"} · {statusLabel(getStatus(chosen))}</p><p className="mt-2 text-sm text-slate-400">Koordinat {chosen.latitude.toFixed(6)}, {chosen.longitude.toFixed(6)} · Akurasi ±{Math.round(chosen.accuracy)} m</p></div><a className="rounded-xl bg-teal-400 px-4 py-3 text-center font-bold text-slate-950" href={`https://www.google.com/maps?q=${chosen.latitude},${chosen.longitude}`} target="_blank" rel="noopener noreferrer">Buka di Google Maps</a></div>}
  </section>;
}
