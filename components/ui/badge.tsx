import { cn } from "@/lib/utils";

const styles = {
  "Belum Selesai": "bg-amber-100 text-amber-800",
  Selesai: "bg-emerald-100 text-emerald-800",
  "Perlu Diperiksa": "bg-red-100 text-red-700",
  Dikunci: "bg-teal-100 text-teal-800",
  Aktif: "bg-emerald-100 text-emerald-800",
  Nonaktif: "bg-slate-100 text-slate-600",
};
export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  const key = String(children) as keyof typeof styles;
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", styles[key] ?? "bg-slate-100 text-slate-700", className)}>{children}</span>;
}
