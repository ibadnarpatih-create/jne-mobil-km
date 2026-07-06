"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createUuid, jakartaNow } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { User, Vehicle, VehicleLog } from "@/lib/types";

const seedUsers: User[] = [
  { id: "u-admin", name: "Admin Operasional", phone: "admin@jne.co.id", password: "admin123", role: "ADMIN", active: true },
  { id: "u-ahmad", name: "Ahmad Arifin", phone: "081234567890", password: "driver123", role: "DRIVER", active: true, vehicleId: "v-rental" },
  { id: "u-budi", name: "Budi Santoso", phone: "081298765432", password: "driver123", role: "DRIVER", active: true, vehicleId: "v-tgr041" },
  { id: "u-dedi", name: "Dedi Kurniawan", phone: "081377788899", password: "driver123", role: "DRIVER", active: true },
];
const seedVehicles: Vehicle[] = [
  { id: "v-rental", code: "RENTAL", plate: "B 9042 BXB", type: "Mobil Box", lastKm: 63081, active: true },
  { id: "v-tgr041", code: "TGR041", plate: "B 9123 KXR", type: "Gran Max", lastKm: 48120, active: true },
  { id: "v-otb", code: "MOBIL OTB", plate: "B 8012 TCM", type: "Blind Van", lastKm: 77420, active: true },
];
const today = jakartaNow().date;
const seedLogs: VehicleLog[] = [
  { id: "log-1", date: today, vehicleId: "v-tgr041", driverId: "u-budi", startTime: "06:42", endTime: "16:58", startKm: 48072, endKm: 48120, distance: 48, startPhoto: "demo", endPhoto: "demo", status: "Selesai" },
  { id: "log-2", date: "2026-07-05", vehicleId: "v-rental", driverId: "u-ahmad", startTime: "06:46", endTime: "17:18", startKm: 63027, endKm: 63081, distance: 54, startPhoto: "demo", endPhoto: "demo", status: "Dikunci" },
];

type Store = {
  users: User[]; vehicles: Vehicle[]; logs: VehicleLog[]; currentUser: User | null; hydrated: boolean; isRemote: boolean;
  login: (identifier: string, password: string) => Promise<User | null>; logout: () => Promise<void>;
  startTrip: (vehicleId: string, km: number, photo: string, location?: string) => Promise<VehicleLog>;
  endTrip: (logId: string, km: number, photo: string, location?: string) => Promise<VehicleLog>;
  updateLog: (id: string, patch: Partial<VehicleLog>) => Promise<void>; lockLog: (id: string) => Promise<void>;
  saveVehicle: (vehicle: Vehicle) => Promise<void>; saveUser: (user: User) => Promise<void>;
};
const StoreContext = createContext<Store | null>(null);

const mapUser = (r: Record<string, any>): User => ({ id: r.id, name: r.nama, phone: r.nomor_hp, password: "", role: r.role, active: r.status, vehicleId: r.kendaraan_utama_id ?? undefined, note: r.keterangan ?? undefined });
const mapVehicle = (r: Record<string, any>): Vehicle => ({ id: r.id, code: r.kode_mobil, plate: r.plat_nomor, type: r.jenis_kendaraan, lastKm: Number(r.km_terakhir), active: r.status, note: r.keterangan ?? undefined });
const mapLog = (r: Record<string, any>): VehicleLog => ({ id: r.id, date: r.tanggal, vehicleId: r.vehicle_id, driverId: r.driver_id, startTime: String(r.jam_awal).slice(0, 5), endTime: r.jam_akhir ? String(r.jam_akhir).slice(0, 5) : undefined, startKm: Number(r.km_awal), endKm: r.km_akhir == null ? undefined : Number(r.km_akhir), distance: r.jarak_tempuh == null ? undefined : Number(r.jarak_tempuh), startPhoto: r.foto_km_awal, endPhoto: r.foto_km_akhir ?? undefined, startLocation: r.latitude_awal ? `${r.latitude_awal}, ${r.longitude_awal}` : undefined, endLocation: r.latitude_akhir ? `${r.latitude_akhir}, ${r.longitude_akhir}` : undefined, status: r.status, adminNote: r.catatan_admin ?? undefined });
const locationParts = (value?: string) => { const [lat, lng] = (value ?? "").split(",").map((x) => Number(x.trim())); return { lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null }; };
const normalizePhone = (value: string) => value.startsWith("0") ? `+62${value.slice(1)}` : value;
const phoneLoginEmail = (value: string) => `${normalizePhone(value).replace(/\D/g, "")}@driver.jne.local`;
const safeName = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");

export function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const isRemote = Boolean(supabase);
  const [users, setUsers] = useState(seedUsers); const [vehicles, setVehicles] = useState(seedVehicles); const [logs, setLogs] = useState(seedLogs);
  const [currentUser, setCurrentUser] = useState<User | null>(null); const [hydrated, setHydrated] = useState(false);

  const signedPhoto = async (path?: string) => {
    if (!supabase || !path || path === "demo" || path.startsWith("http")) return path;
    const { data } = await supabase.storage.from("dashboard-photos").createSignedUrl(path, 3600);
    return data?.signedUrl ?? path;
  };
  const loadRemote = async (userId: string) => {
    if (!supabase) return null;
    const { data: profile, error } = await supabase.from("users").select("*").eq("id", userId).single();
    if (error || !profile) throw new Error("Profil pengguna belum dibuat oleh admin.");
    const user = mapUser(profile); setCurrentUser(user);
    const [vehicleResult, logResult, userResult] = await Promise.all([
      supabase.from("vehicles").select("*").order("kode_mobil"),
      supabase.from("vehicle_logs").select("*").order("tanggal", { ascending: false }),
      user.role === "ADMIN" ? supabase.from("users").select("*").order("nama") : Promise.resolve({ data: [profile], error: null }),
    ]);
    if (vehicleResult.error) throw vehicleResult.error; if (logResult.error) throw logResult.error; if (userResult.error) throw userResult.error;
    setVehicles((vehicleResult.data ?? []).map(mapVehicle)); setUsers((userResult.data ?? []).map(mapUser));
    const mapped = (logResult.data ?? []).map(mapLog);
    setLogs(await Promise.all(mapped.map(async (log) => ({ ...log, startPhoto: (await signedPhoto(log.startPhoto)) ?? "", endPhoto: await signedPhoto(log.endPhoto) }))));
    return user;
  };

  useEffect(() => {
    (async () => {
      try {
        if (supabase) { const { data } = await supabase.auth.getSession(); if (data.session) await loadRemote(data.session.user.id); }
        else { const raw = localStorage.getItem("jne-mobile-km"); if (raw) { const data = JSON.parse(raw); setUsers(data.users ?? seedUsers); setVehicles(data.vehicles ?? seedVehicles); setLogs(data.logs ?? seedLogs); setCurrentUser(data.currentUser ?? null); } }
      } catch (error) { console.error("Gagal memuat data Supabase", error); }
      finally { setHydrated(true); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (hydrated && !supabase) localStorage.setItem("jne-mobile-km", JSON.stringify({ users, vehicles, logs, currentUser })); }, [users, vehicles, logs, currentUser, hydrated, supabase]);

  const uploadPhoto = async (photo: string, suffix: "KM-AWAL" | "KM-AKHIR", vehicleId: string) => {
    if (!supabase || !currentUser) return { path: photo, url: photo };
    const vehicle = vehicles.find((v) => v.id === vehicleId); const now = jakartaNow();
    const path = `${currentUser.id}/${now.date}_${safeName(vehicle?.plate ?? "KENDARAAN")}_${safeName(currentUser.name)}_${suffix}.jpg`;
    const blob = await (await fetch(photo)).blob(); const { error } = await supabase.storage.from("dashboard-photos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (error) throw error; return { path, url: (await signedPhoto(path)) ?? path };
  };

  const value = useMemo<Store>(() => ({
    users, vehicles, logs, currentUser, hydrated, isRemote,
    async login(identifier, password) {
      if (!supabase) { const user = users.find((u) => u.active && u.phone.toLowerCase() === identifier.trim().toLowerCase() && u.password === password) ?? null; setCurrentUser(user); return user; }
      const credentials = { email: identifier.includes("@") ? identifier.trim() : phoneLoginEmail(identifier.trim()), password };
      const { data, error } = await supabase.auth.signInWithPassword(credentials); if (error || !data.user) return null; return loadRemote(data.user.id);
    },
    async logout() { if (supabase) await supabase.auth.signOut(); setCurrentUser(null); },
    async startTrip(vehicleId, km, photo, location) {
      if (!currentUser) throw new Error("Sesi login tidak ditemukan."); const now = jakartaNow();
      if (!supabase) { const log: VehicleLog = { id: createUuid(), date: now.date, vehicleId, driverId: currentUser.id, startTime: now.time, startKm: km, startPhoto: photo, startLocation: location, status: "Belum Selesai" }; setLogs((old) => [log, ...old]); return log; }
      const uploaded = await uploadPhoto(photo, "KM-AWAL", vehicleId); const loc = locationParts(location);
      const { data, error } = await supabase.from("vehicle_logs").insert({ tanggal: now.date, vehicle_id: vehicleId, driver_id: currentUser.id, jam_awal: now.time, km_awal: km, foto_km_awal: uploaded.path, latitude_awal: loc.lat, longitude_awal: loc.lng }).select().single();
      if (error) throw error; const log = { ...mapLog(data), startPhoto: uploaded.url }; setLogs((old) => [log, ...old]); return log;
    },
    async endTrip(logId, km, photo, location) {
      const old = logs.find((l) => l.id === logId); if (!old) throw new Error("Perjalanan tidak ditemukan."); const distance = km - old.startKm; const now = jakartaNow();
      if (!supabase) { const updated: VehicleLog = { ...old, endTime: now.time, endKm: km, distance, endPhoto: photo, endLocation: location, status: distance > 300 ? "Perlu Diperiksa" : "Selesai" }; setLogs((items) => items.map((l) => l.id === logId ? updated : l)); setVehicles((items) => items.map((v) => v.id === old.vehicleId ? { ...v, lastKm: km } : v)); return updated; }
      const uploaded = await uploadPhoto(photo, "KM-AKHIR", old.vehicleId); const loc = locationParts(location);
      const { data, error } = await supabase.rpc("finish_vehicle_log", { p_log_id: logId, p_km_akhir: km, p_foto: uploaded.path, p_lat: loc.lat, p_lng: loc.lng });
      if (error) throw error; const updated = { ...mapLog(data), startPhoto: old.startPhoto, endPhoto: uploaded.url }; setLogs((items) => items.map((l) => l.id === logId ? updated : l)); setVehicles((items) => items.map((v) => v.id === old.vehicleId ? { ...v, lastKm: km } : v)); return updated;
    },
    async updateLog(id, patch) { setLogs((items) => items.map((l) => l.id === id ? { ...l, ...patch } : l)); if (supabase) await supabase.from("vehicle_logs").update({ status: patch.status, catatan_admin: patch.adminNote }).eq("id", id); },
    async lockLog(id) { setLogs((items) => items.map((l) => l.id === id ? { ...l, status: "Dikunci" } : l)); if (supabase) { const { error } = await supabase.from("vehicle_logs").update({ status: "Dikunci" }).eq("id", id); if (error) throw error; } },
    async saveVehicle(vehicle) { if (supabase) { const { error } = await supabase.from("vehicles").upsert({ id: vehicle.id, kode_mobil: vehicle.code, plat_nomor: vehicle.plate, jenis_kendaraan: vehicle.type, km_terakhir: vehicle.lastKm, status: vehicle.active, keterangan: vehicle.note }); if (error) throw error; } setVehicles((items) => items.some((v) => v.id === vehicle.id) ? items.map((v) => v.id === vehicle.id ? vehicle : v) : [...items, vehicle]); },
    async saveUser(user) {
      if (!supabase) { setUsers((items) => items.some((u) => u.id === user.id) ? items.map((u) => u.id === user.id ? user : u) : [...items, user]); return; }
      const existing = users.some((u) => u.id === user.id); const payload = { id: user.id, nama: user.name, nomor_hp: user.phone, role: user.role, status: user.active, kendaraan_utama_id: user.vehicleId ?? null, keterangan: user.note ?? null };
      if (existing) { const { error } = await supabase.from("users").update(payload).eq("id", user.id); if (error) throw error; setUsers((items) => items.map((item) => item.id === user.id ? user : item)); }
      else { const result = await supabase.functions.invoke("create-driver", { body: { ...payload, password: user.password } }); if (result.error) throw result.error; const created = mapUser(result.data); setUsers((items) => [...items, created]); }
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [users, vehicles, logs, currentUser, hydrated, isRemote, supabase]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useDemoStore() { const value = useContext(StoreContext); if (!value) throw new Error("DemoStoreProvider belum tersedia"); return value; }
