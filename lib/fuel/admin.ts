import { createClient } from "@/lib/supabase/client";

const DEMO_KEY = "movetra-fuel-transactions-v1";
export type FuelTransactionStatus = "DRAFT" | "SUBMITTED" | "VERIFIED" | "NEED_REVIEW" | "REJECTED";

export type FuelTransactionRecord = {
  id: string; vehicleId: string; driverId: string; transactionDate: string;
  transactionTime: string; odometerAtRefuel: number; previousOdometer?: number;
  fuelTypeId: string; pricePerLiter: number; estimatedLiters: number;
  estimatedAmount: number; realPayment: number; paymentDifference: number;
  totalDistance: number; fuelStationId?: string; fuelStationName?: string;
  latitude?: number; longitude?: number; kmBeforePhoto: string;
  kmAfterPhoto: string; dispenserPhoto: string; receiptPhoto: string;
  notes?: string; status: FuelTransactionStatus; rejectionReason?: string;
  verifiedAt?: string;
};

type TransactionRow = Record<string, unknown>;
const mapRemote = (row: TransactionRow): FuelTransactionRecord => ({
  id: String(row.id), vehicleId: String(row.vehicle_id), driverId: String(row.driver_id),
  transactionDate: String(row.transaction_date), transactionTime: String(row.transaction_time).slice(0, 5),
  odometerAtRefuel: Number(row.odometer_at_refuel), previousOdometer: row.previous_odometer == null ? undefined : Number(row.previous_odometer),
  fuelTypeId: String(row.fuel_type_id), pricePerLiter: Number(row.price_per_liter),
  estimatedLiters: Number(row.estimated_liters ?? 0), estimatedAmount: Number(row.estimated_amount),
  realPayment: Number(row.real_payment), paymentDifference: Number(row.estimated_amount) - Number(row.real_payment),
  totalDistance: Number(row.total_distance), fuelStationId: row.fuel_station_id ? String(row.fuel_station_id) : undefined,
  fuelStationName: row.fuel_station_name ? String(row.fuel_station_name) : undefined,
  latitude: row.latitude == null ? undefined : Number(row.latitude), longitude: row.longitude == null ? undefined : Number(row.longitude),
  kmBeforePhoto: String(row.km_before_photo_url ?? ""), kmAfterPhoto: String(row.km_after_photo_url ?? ""),
  dispenserPhoto: String(row.dispenser_photo_url ?? ""), receiptPhoto: String(row.receipt_photo_url ?? ""),
  notes: row.notes ? String(row.notes) : undefined, status: row.status as FuelTransactionStatus,
  rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
  verifiedAt: row.verified_at ? String(row.verified_at) : undefined,
});
const mapDemo = (row: TransactionRow): FuelTransactionRecord => ({
  id: String(row.id), vehicleId: String(row.vehicleId), driverId: String(row.driverId),
  transactionDate: String(row.transactionDate), transactionTime: String(row.transactionTime),
  odometerAtRefuel: Number(row.odometerAtRefuel), previousOdometer: row.previousOdometer == null ? undefined : Number(row.previousOdometer),
  fuelTypeId: String(row.fuelTypeId), pricePerLiter: Number(row.pricePerLiter ?? 0), estimatedLiters: Number(row.estimatedLiters ?? 0),
  estimatedAmount: Number(row.estimatedAmount ?? 0), realPayment: Number(row.realPayment), paymentDifference: Number(row.estimatedAmount ?? 0) - Number(row.realPayment),
  totalDistance: Number(row.totalDistance ?? 0), fuelStationId: row.fuelStationId ? String(row.fuelStationId) : undefined,
  fuelStationName: row.fuelStationName ? String(row.fuelStationName) : undefined,
  latitude: row.latitude == null ? undefined : Number(row.latitude), longitude: row.longitude == null ? undefined : Number(row.longitude),
  kmBeforePhoto: String(row.kmBeforePhoto ?? ""), kmAfterPhoto: String(row.kmAfterPhoto ?? ""), dispenserPhoto: String(row.dispenserPhoto ?? ""), receiptPhoto: String(row.receiptPhoto ?? ""),
  notes: row.notes ? String(row.notes) : undefined, status: row.status as FuelTransactionStatus,
  rejectionReason: row.rejectionReason ? String(row.rejectionReason) : undefined, verifiedAt: row.verifiedAt ? String(row.verifiedAt) : undefined,
});

async function signedPhoto(path: string): Promise<string> {
  const supabase = createClient();
  if (!supabase || !path || path.startsWith("data:") || path.startsWith("http")) return path;
  const { data } = await supabase.storage.from("fuel-photos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? path;
}

export async function loadFuelTransactions(): Promise<FuelTransactionRecord[]> {
  const supabase = createClient();
  if (!supabase) return (JSON.parse(localStorage.getItem(DEMO_KEY) ?? "[]") as TransactionRow[]).map(mapDemo);
  const { data, error } = await supabase.from("fuel_transactions").select("*").order("transaction_date", { ascending: false }).order("transaction_time", { ascending: false });
  if (error) throw error;
  return Promise.all(((data ?? []) as TransactionRow[]).map(async (row) => {
    const item = mapRemote(row);
    const [kmBeforePhoto, kmAfterPhoto, dispenserPhoto, receiptPhoto] = await Promise.all([signedPhoto(item.kmBeforePhoto), signedPhoto(item.kmAfterPhoto), signedPhoto(item.dispenserPhoto), signedPhoto(item.receiptPhoto)]);
    return { ...item, kmBeforePhoto, kmAfterPhoto, dispenserPhoto, receiptPhoto };
  }));
}

export async function reviewFuelTransaction(id: string, action: "VERIFY" | "REJECT" | "NEED_REVIEW", notes?: string): Promise<void> {
  const supabase = createClient();
  if (!supabase) {
    const rows = JSON.parse(localStorage.getItem(DEMO_KEY) ?? "[]") as TransactionRow[];
    localStorage.setItem(DEMO_KEY, JSON.stringify(rows.map((row) => row.id === id ? { ...row, status: action === "VERIFY" ? "VERIFIED" : action === "REJECT" ? "REJECTED" : "NEED_REVIEW", rejectionReason: action === "REJECT" ? notes : undefined, verifiedAt: action === "VERIFY" ? new Date().toISOString() : undefined } : row)));
    return;
  }
  const { error } = await supabase.rpc("review_fuel_transaction", { p_transaction_id: id, p_action: action, p_notes: notes || null });
  if (error) throw error;
}
