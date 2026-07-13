import Image from "next/image";
import { cn } from "@/lib/utils";

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <div className="relative h-10 w-10 shrink-0 overflow-hidden">
          <Image
            src="/movetra-symbol.png"
            alt="Movetra"
            width={1620}
            height={1620}
            className="absolute -left-3 -top-3 h-16 w-16 max-w-none"
            priority
          />
        </div>
        <div>
          <p className="text-base font-extrabold uppercase leading-none tracking-[0.08em] text-[#071d3d]">
            Movetra
          </p>
          <p className="mt-1 text-[9px] font-semibold tracking-wide text-[#058f83]">
            Move Smarter, Work Better
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative h-10 w-52 overflow-hidden">
        <Image
          src="/movetra-wordmark.png"
          alt="Movetra"
          width={813}
          height={325}
          className="absolute -left-4 -top-[31px] h-auto w-60 max-w-none"
          priority
        />
      </div>
      <p className="mt-1 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
        Move Smarter, <span className="text-[#058f83]">Work Better.</span>
      </p>
    </div>
  );
}
