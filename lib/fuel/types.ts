export interface FuelType {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface FuelPrice {
  id: string;
  fuelTypeId: string;
  pricePerLiter: number;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  isActive: boolean;
}

export interface FuelStation {
  id: string;
  name: string;
  code: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
}

export type FuelMasterData = {
  fuelTypes: FuelType[];
  fuelPrices: FuelPrice[];
  fuelStations: FuelStation[];
};
