import Image from "next/image";
import { cn } from "@/lib/utils";

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("overflow-hidden rounded-xl bg-white", compact ? "h-10 w-16" : "h-14 w-24")}>
        <Image src="/jne-logo.jpg" alt="JNE Express" width={160} height={100} className="h-full w-full object-contain" priority />
      </div>
      <div>
        <p className={cn("font-extrabold leading-tight text-jne-blue", compact ? "text-base" : "text-xl")}>JNE Mobile KM</p>
        {!compact && <p className="text-xs text-slate-500">Catatan kendaraan operasional</p>}
      </div>
    </div>
  );
}
