"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { useDemoStore } from "@/lib/demo-store";

export default function LoginPage() {
  const router = useRouter();
  const { login, currentUser, hydrated } = useDemoStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (hydrated && currentUser)
      router.replace(currentUser.role === "ADMIN" ? "/admin" : "/driver");
  }, [hydrated, currentUser, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(identifier, password);
      if (!user) {
        setError("ID Login/email atau password belum benar.");
        return;
      }
      router.push(user.role === "ADMIN" ? "/admin" : "/driver");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Login belum berhasil.",
      );
    } finally {
      setBusy(false);
    }
  };
  const fillDemo = (role: "driver" | "admin") => {
    if (role === "driver") {
      setIdentifier("TGR250");
      setPassword("driver123");
    } else {
      setIdentifier("admin@jne.co.id");
      setPassword("admin123");
    }
    setError("");
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-jne-pale px-5 py-8 sm:grid sm:place-items-center">
      <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-movetra-teal/10" />
      <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-movetra-navy/10" />
      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <Brand />
        </div>
        <Card className="border-0 shadow-soft">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-slate-900">
                Selamat datang
              </h1>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Masuk untuk mencatat perjalanan atau memeriksa laporan.
              </p>
            </div>
            <form onSubmit={submit} className="space-y-5">
              <div>
                <Label htmlFor="identifier">ID Login atau email</Label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <Input
                    id="identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-12"
                    placeholder="Contoh: TGR250"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <Input
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="px-12"
                    type={show ? "text" : "password"}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    aria-label="Tampilkan password"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-2.5 rounded-lg p-2 text-slate-400"
                  >
                    {show ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {error}
                </div>
              )}
              <Button className="w-full" size="lg" disabled={busy}>
                {busy ? "Sedang masuk…" : "Masuk ke Aplikasi"}
              </Button>
            </form>
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Akun demo
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => fillDemo("driver")}>
                <Truck className="h-4 w-4" /> Driver
              </Button>
              <Button variant="outline" onClick={() => fillDemo("admin")}>
                <ShieldCheck className="h-4 w-4" /> Admin
              </Button>
            </div>
          </CardContent>
        </Card>
        <p className="mt-5 text-center text-xs text-slate-400">
          Waktu pencatatan mengikuti zona Asia/Jakarta
        </p>
      </div>
    </main>
  );
}
