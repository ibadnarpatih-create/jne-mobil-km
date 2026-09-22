"use client";
import { useEffect, useState } from "react";
import { isNativeDriver, nativeDriver } from "@/lib/native-driver";

export function NativeTrackingStatus() {
  const [status, setStatus] = useState<{ running: boolean; signedIn: boolean; message: string } | null>(null);
  useEffect(() => {
    if (!isNativeDriver()) return;
    let cancelled = false;
    const update = () => nativeDriver("status").then(value => { if (!cancelled) setStatus(value as typeof status); }).catch(() => undefined);
    void update();
    const timer = setInterval(update, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);
  if (!status) return null;
  return <section className="m-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
    <strong>GPS Android {status.running ? "aktif" : "tidak aktif"}</strong>
    <p role="status" className="mt-2">{status.message}</p>
    {!status.signedIn && <p className="mt-2">Keluar lalu masuk kembali untuk menghubungkan sesi GPS APK.</p>}
    {status.signedIn && !status.running && <button className="mt-2 rounded-lg bg-teal-800 p-3 text-white" onClick={() => void nativeDriver("start").catch(error => setStatus({ ...status, message: error.message }))}>Aktifkan GPS perjalanan</button>}
  </section>;
}
