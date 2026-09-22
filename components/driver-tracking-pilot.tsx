"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isNativeDriver } from "@/lib/native-driver";

// Deliberately opt-in: this browser pilot does not promise background tracking.
export function DriverTrackingPilot({ logId }: { logId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("GPS belum diaktifkan.");
  useEffect(() => {
    if (!enabled) return;
    if (!window.isSecureContext) {
      setStatus("GPS memerlukan HTTPS. Buka alamat HTTPS aplikasi saat menguji dari HP; alamat HTTP jaringan lokal tidak mendukung GPS.");
      setEnabled(false);
      return;
    }
    const client = createClient();
    if (!client || !navigator.geolocation) {
      setStatus("GPS atau koneksi Supabase tidak tersedia.");
      setEnabled(false);
      return;
    }
    let cancelled = false;
    let sending = false;
    let lastCaptured = 0;
    type Point = { p_id: string; p_log_id: string; p_latitude: number; p_longitude: number; p_accuracy: number; p_recorded_at: string };
    const queue: Point[] = [];
    async function flush() {
      if (cancelled || sending || !client || !queue.length) return;
      sending = true;
      try {
        while (!cancelled && queue.length) {
          const { error } = await client.rpc("record_tracking_point", queue[0]);
          if (cancelled) return;
          if (error) {
            if (error.code === "42501" || error.code === "22023") {
              setStatus("Tracking dihentikan: perjalanan, izin akun, atau waktu lokasi tidak valid.");
              setEnabled(false);
            } else setStatus(`Lokasi belum terkirim (${queue.length} titik). Periksa koneksi dan kesiapan database.`);
            return;
          }
          queue.shift();
          setStatus(`Lokasi terkirim ${new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" })} WIB.`);
        }
      } catch {
        if (!cancelled) setStatus("Jaringan terputus. Mencoba kirim lagi selama halaman terbuka.");
      } finally { sending = false; }
    }
    setStatus("Meminta izin dan mencari lokasi…");
    const watch = navigator.geolocation.watchPosition(position => {
      if (cancelled || Date.now() - lastCaptured < 30000) return;
      lastCaptured = Date.now();
      if (queue.length >= 120) {
        setStatus("Antrean penuh. Uji GPS dihentikan; periksa koneksi sebelum mengaktifkan lagi.");
        setEnabled(false);
        return;
      }
      queue.push({ p_id: crypto.randomUUID(), p_log_id: logId,
        p_latitude: position.coords.latitude, p_longitude: position.coords.longitude,
        p_accuracy: position.coords.accuracy, p_recorded_at: new Date(position.timestamp).toISOString() });
      void flush();
    }, error => {
      if (cancelled) return;
      setStatus(error.code === 1 ? "Izin lokasi ditolak. Izinkan lokasi di pengaturan browser, lalu coba lagi." : "GPS belum tersedia. Pastikan lokasi HP aktif dan sinyal GPS memadai.");
      if (error.code === 1) setEnabled(false);
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    const retry = setInterval(() => void flush(), 15000);
    const onOnline = () => { void flush(); };
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watch);
      clearInterval(retry);
      window.removeEventListener("online", onOnline);
    };
  }, [enabled, logId]);

  if (isNativeDriver()) return null;
  return <section className="m-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
    <p className="font-bold text-teal-950">Uji GPS perjalanan</p>
    <p className="mt-1 text-xs text-teal-900">Lokasi dibagikan ke admin selama uji aktif. Biarkan halaman terbuka dan layar menyala. Antrean sementara hilang saat halaman ditutup atau uji dihentikan.</p>
    <p role="status" className="mt-3 text-sm text-slate-700">{status}</p>
    <button className="mt-3 rounded-xl bg-teal-800 px-4 py-2 text-sm font-bold text-white" onClick={() => {
      if (enabled) setStatus("Uji GPS dihentikan.");
      setEnabled(!enabled);
    }}>{enabled ? "Hentikan uji GPS" : "Aktifkan uji GPS"}</button>
  </section>;
}
