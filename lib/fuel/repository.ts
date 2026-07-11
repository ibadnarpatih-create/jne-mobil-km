import { createClient } from "@/lib/supabase/client";
import { createUuid } from "@/lib/utils";
import type {
  FuelMasterData,
  FuelPrice,
  FuelStation,
  FuelType,
} from "@/lib/fuel/types";

const STORAGE_KEY = "movetra-fuel-master-v1";
const seedFuelTypes: FuelType[] = [
  ["Pertalite", "PERTALITE", "Bensin RON 90"],
  ["Pertamax", "PERTAMAX", "Bensin RON 92"],
  ["Pertamax Turbo", "PERTAMAX_TURBO", "Bensin RON 98"],
  ["Biosolar", "BIOSOLAR", "Bahan bakar diesel bersubsidi"],
  ["Dexlite", "DEXLITE", "Bahan bakar diesel CN 51"],
  ["Pertamina Dex", "PERTAMINA_DEX", "Bahan bakar diesel CN 53"],
].map(([name, code, description]) => ({
  id: `fuel-${code.toLowerCase()}`,
  name,
  code,
  description,
  isActive: true,
}));

const emptyDemoData = (): FuelMasterData => ({
  fuelTypes: seedFuelTypes,
  fuelPrices: [],
  fuelStations: [],
});

const readDemo = (): FuelMasterData => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyDemoData();
  try {
    return { ...emptyDemoData(), ...JSON.parse(raw) } as FuelMasterData;
  } catch {
    return emptyDemoData();
  }
};
const writeDemo = (data: FuelMasterData) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

type FuelTypeRow = {
  id: string; name: string; code: string; description: string | null; is_active: boolean;
};
type FuelPriceRow = {
  id: string; fuel_type_id: string; price_per_liter: number | string;
  effective_start_date: string; effective_end_date: string | null; is_active: boolean;
};
type FuelStationRow = {
  id: string; name: string; code: string; address: string | null;
  latitude: number | string | null; longitude: number | string | null; is_active: boolean;
};

const mapFuelType = (row: FuelTypeRow): FuelType => ({
  id: row.id, name: row.name, code: row.code,
  description: row.description ?? undefined, isActive: row.is_active,
});
const mapFuelPrice = (row: FuelPriceRow): FuelPrice => ({
  id: row.id, fuelTypeId: row.fuel_type_id,
  pricePerLiter: Number(row.price_per_liter),
  effectiveStartDate: row.effective_start_date,
  effectiveEndDate: row.effective_end_date ?? undefined,
  isActive: row.is_active,
});
const mapFuelStation = (row: FuelStationRow): FuelStation => ({
  id: row.id, name: row.name, code: row.code,
  address: row.address ?? undefined,
  latitude: row.latitude == null ? undefined : Number(row.latitude),
  longitude: row.longitude == null ? undefined : Number(row.longitude),
  isActive: row.is_active,
});

export async function loadFuelMasterData(): Promise<FuelMasterData> {
  const supabase = createClient();
  if (!supabase) return readDemo();
  const [types, prices, stations] = await Promise.all([
    supabase.from("fuel_types").select("*").order("name"),
    supabase.from("fuel_prices").select("*").order("effective_start_date", { ascending: false }),
    supabase.from("fuel_stations").select("*").order("name"),
  ]);
  const error = types.error ?? prices.error ?? stations.error;
  if (error) throw error;
  return {
    fuelTypes: ((types.data ?? []) as FuelTypeRow[]).map(mapFuelType),
    fuelPrices: ((prices.data ?? []) as FuelPriceRow[]).map(mapFuelPrice),
    fuelStations: ((stations.data ?? []) as FuelStationRow[]).map(mapFuelStation),
  };
}

export async function saveFuelType(value: FuelType): Promise<void> {
  const supabase = createClient();
  if (!supabase) {
    const data = readDemo();
    data.fuelTypes = upsert(data.fuelTypes, value);
    writeDemo(data); return;
  }
  const { error } = await supabase.from("fuel_types").upsert({
    id: value.id, name: value.name.trim(), code: value.code,
    description: value.description?.trim() || null, is_active: value.isActive,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function saveFuelPrice(value: FuelPrice): Promise<void> {
  const supabase = createClient();
  if (!supabase) {
    const data = readDemo();
    const overlaps = data.fuelPrices.some((item) =>
      item.id !== value.id && item.fuelTypeId === value.fuelTypeId && item.isActive && value.isActive
      && rangesOverlap(item.effectiveStartDate, item.effectiveEndDate, value.effectiveStartDate, value.effectiveEndDate));
    if (overlaps) throw new Error("Periode harga BBM aktif tidak boleh tumpang tindih.");
    data.fuelPrices = upsert(data.fuelPrices, value);
    writeDemo(data); return;
  }
  const { error } = await supabase.from("fuel_prices").upsert({
    id: value.id, fuel_type_id: value.fuelTypeId,
    price_per_liter: value.pricePerLiter,
    effective_start_date: value.effectiveStartDate,
    effective_end_date: value.effectiveEndDate || null,
    is_active: value.isActive, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function saveFuelStation(value: FuelStation): Promise<void> {
  const supabase = createClient();
  if (!supabase) {
    const data = readDemo();
    data.fuelStations = upsert(data.fuelStations, value);
    writeDemo(data); return;
  }
  const { error } = await supabase.from("fuel_stations").upsert({
    id: value.id, name: value.name.trim(), code: value.code,
    address: value.address?.trim() || null,
    latitude: value.latitude ?? null, longitude: value.longitude ?? null,
    is_active: value.isActive, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export const newFuelMasterId = () => createUuid();
const upsert = <T extends { id: string }>(items: T[], value: T) =>
  items.some((item) => item.id === value.id)
    ? items.map((item) => item.id === value.id ? value : item)
    : [...items, value];
const rangesOverlap = (aStart: string, aEnd: string | undefined, bStart: string, bEnd: string | undefined) =>
  aStart <= (bEnd || "9999-12-31") && bStart <= (aEnd || "9999-12-31");
