import type { FuelTransactionStatus } from "@/lib/fuel/admin";

export const fuelStatusLabels: Record<FuelTransactionStatus, string> = {
  DRAFT: "Draf",
  SUBMITTED: "Diajukan",
  VERIFIED: "Terverifikasi",
  NEED_REVIEW: "Perlu diperiksa",
  REJECTED: "Ditolak",
};

const tones: Record<FuelTransactionStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-[#e8f0fe] text-[#1554c0]",
  VERIFIED: "bg-green-100 text-green-800",
  NEED_REVIEW: "bg-amber-100 text-amber-900",
  REJECTED: "bg-red-100 text-red-800",
};

export function FuelStatusBadge({ status }: { status: FuelTransactionStatus }) {
  return <span className={`inline-flex whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold ${tones[status]}`}>{fuelStatusLabels[status] ?? status}</span>;
}
