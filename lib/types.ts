export type Role = "DRIVER" | "ADMIN";
export type LogStatus =
  "Belum Selesai" | "Selesai" | "Perlu Diperiksa" | "Dikunci";

export interface User {
  id: string;
  name: string;
  loginId?: string;
  phone: string;
  password: string;
  role: Role;
  active: boolean;
  vehicleId?: string;
  note?: string;
}
export interface Vehicle {
  id: string;
  code: string;
  plate: string;
  type: string;
  unitGroup: string;
  lastKm: number;
  fuelTankCapacity?: number;
  active: boolean;
  note?: string;
}
export interface VehicleLog {
  id: string;
  date: string;
  vehicleId: string;
  driverId: string;
  startTime: string;
  endTime?: string;
  startKm: number;
  endKm?: number;
  distance?: number;
  startPhoto: string;
  endPhoto?: string;
  startLocation?: string;
  endLocation?: string;
  status: LogStatus;
  adminNote?: string;
}

export type AssetInspectionStatus = "OK" | "TIDAK ADA";

export interface AssetTripShipment {
  suratJalan: string;
  qty?: number;
  weightKg?: number;
}

export interface AssetTripDestination {
  startPoint: string;
  startKm?: number;
  destination: string;
  endKm?: number;
  departDate?: string;
  departTime?: string;
  arriveDate?: string;
  arriveTime?: string;
}

export interface AssetTripInspection {
  stnk: AssetInspectionStatus;
  kir: AssetInspectionStatus;
  body: AssetInspectionStatus;
  roda: AssetInspectionStatus;
  banSerep: AssetInspectionStatus;
  lampuBox: AssetInspectionStatus;
  kancingBox: AssetInspectionStatus;
  dongkrak: AssetInspectionStatus;
  kunciRoda: AssetInspectionStatus;
  lainLain: AssetInspectionStatus;
}

export interface AssetTrip {
  id: string;
  driverName: string;
  driverNik: string;
  vehiclePlate: string;
  vehicleName: string;
  shipments: AssetTripShipment[];
  destinations: AssetTripDestination[];
  inspection: AssetTripInspection;
  createdBy: string;
  createdAt: string;
}
