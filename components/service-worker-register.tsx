"use client";
import { useEffect } from "react";
import { isNativeDriver, nativeDriver } from "@/lib/native-driver";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (isNativeDriver()) { void nativeDriver("status").catch(() => undefined); }
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => undefined);
    }
  }, []);
  return null;
}
