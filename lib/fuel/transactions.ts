import { createClient } from "@/lib/supabase/client";
import { createUuid } from "@/lib/utils";

export type SubmitFuelTransaction = {
  driverId: string;
  vehicleId: string;
  tripIds: string[];
  transactionDate: string;
  transactionTime: string;
  odometerAtRefuel: number;
  fuelTypeId: string;
  realPayment: number;
  fuelStationId?: string;
  fuelStationName?: string;
  latitude?: number;
  longitude?: number;
  kmBeforePhoto: string;
  kmAfterPhoto: string;
  dispenserPhoto: string;
  receiptPhoto: string;
  notes?: string;
};

const DEMO_KEY = "movetra-fuel-transactions-v1";
const safeName = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, "-");

async function uploadFuelPhoto(
  dataUrl: string,
  kind: "receipt" | "km-before" | "km-after" | "dispenser",
): Promise<string> {
  const supabase = createClient();
  if (!supabase) return dataUrl;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sesi pengguna tidak ditemukan.");
  const path = `${auth.user.id}/${new Date().toISOString().slice(0, 10)}_${kind}_${safeName(createUuid())}.jpg`;
  const blob = await (await fetch(dataUrl)).blob();
  const { error } = await supabase.storage.from("fuel-photos").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function submitFuelTransaction(input: SubmitFuelTransaction): Promise<string> {
  const supabase = createClient();
  if (!supabase) {
    const id = createUuid();
    const current = JSON.parse(localStorage.getItem(DEMO_KEY) ?? "[]") as Array<Record<string, unknown>>;
    const previous = current
      .filter((item) => item.vehicleId === input.vehicleId && item.status !== "REJECTED")
      .sort((a, b) => String(b.transactionDate).localeCompare(String(a.transactionDate)))[0];
    const previousOdometer = previous ? Number(previous.odometerAtRefuel) : null;
    const distance = previousOdometer == null ? 0 : Math.max(0, input.odometerAtRefuel - previousOdometer);
    const estimatedLiters = Math.round((distance / 8) * 100) / 100;
    const masters = await import("@/lib/fuel/repository").then((module) => module.loadFuelMasterData());
    const price = masters.fuelPrices.find((item) => item.fuelTypeId === input.fuelTypeId && item.isActive && item.effectiveStartDate <= input.transactionDate && (!item.effectiveEndDate || item.effectiveEndDate >= input.transactionDate))?.pricePerLiter ?? 0;
    const estimatedAmount = Math.round(estimatedLiters * price);
    localStorage.setItem(DEMO_KEY, JSON.stringify([{ id, ...input, pricePerLiter: price, previousOdometer, totalDistance: distance, estimatedLiters, estimatedAmount, paymentDifference: input.realPayment - estimatedAmount, standardKmPerLiter: 8, status: "SUBMITTED", createdAt: new Date().toISOString() }, ...current]));
    return id;
  }
  const [receiptPhotoPath, kmBeforePhotoPath, kmAfterPhotoPath, dispenserPhotoPath] = await Promise.all([
    uploadFuelPhoto(input.receiptPhoto, "receipt"),
    uploadFuelPhoto(input.kmBeforePhoto, "km-before"),
    uploadFuelPhoto(input.kmAfterPhoto, "km-after"),
    uploadFuelPhoto(input.dispenserPhoto, "dispenser"),
  ]);
  const { data, error } = await supabase.rpc("submit_fuel_transaction", {
    p_vehicle_id: input.vehicleId,
    p_trip_ids: input.tripIds,
    p_transaction_date: input.transactionDate,
    p_transaction_time: input.transactionTime,
    p_odometer_at_refuel: input.odometerAtRefuel,
    p_fuel_type_id: input.fuelTypeId,
    p_real_payment: input.realPayment,
    p_fuel_station_id: input.fuelStationId || null,
    p_fuel_station_name: input.fuelStationName || null,
    p_latitude: input.latitude ?? null,
    p_longitude: input.longitude ?? null,
    p_km_before_photo_url: kmBeforePhotoPath,
    p_km_after_photo_url: kmAfterPhotoPath,
    p_dispenser_photo_url: dispenserPhotoPath,
    p_receipt_photo_url: receiptPhotoPath,
    p_notes: input.notes || null,
  });
  if (error) throw error;
  return String(data);
}

export type PreviousFuelTransaction = {
  id: string;
  odometer: number;
  date: string;
  fillingType: "FULL" | "PARTIAL";
};

export async function loadPreviousFuelTransaction(
  vehicleId: string,
  transactionDate: string,
): Promise<PreviousFuelTransaction | null> {
  if (!vehicleId) return null;
  const supabase = createClient();
  if (!supabase) {
    const rows = JSON.parse(localStorage.getItem(DEMO_KEY) ?? "[]") as Array<{
      id: string; vehicleId: string; transactionDate: string;
      odometerAtRefuel: number; status: string;
    }>;
    const row = rows
      .filter((item) => item.vehicleId === vehicleId && item.transactionDate <= transactionDate && item.status !== "REJECTED")
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))[0];
    return row ? { id: row.id, odometer: row.odometerAtRefuel, date: row.transactionDate, fillingType: "FULL" } : null;
  }
  const { data, error } = await supabase
    .from("fuel_transactions")
    .select("id,odometer_at_refuel,transaction_date,filling_type")
    .eq("vehicle_id", vehicleId)
    .neq("status", "REJECTED")
    .lte("transaction_date", transactionDate)
    .order("transaction_date", { ascending: false })
    .order("transaction_time", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? {
    id: data.id,
    odometer: Number(data.odometer_at_refuel),
    date: data.transaction_date,
    fillingType: data.filling_type as "FULL" | "PARTIAL",
  } : null;
}
