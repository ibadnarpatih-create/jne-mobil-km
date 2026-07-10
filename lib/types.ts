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
