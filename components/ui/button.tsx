import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
};

export function Button({ className, variant = "primary", size = "default", ...props }: Props) {
  const variants = {
    primary: "bg-jne-blue text-white hover:bg-[#006c65] shadow-sm",
    secondary: "bg-movetra-navy text-white hover:bg-[#0c2d4b] shadow-sm",
    outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-red-50 text-red-700 hover:bg-red-100",
    ghost: "text-slate-600 hover:bg-slate-100",
  };
  const sizes = { default: "h-11 px-4", sm: "h-9 px-3 text-sm", lg: "h-14 px-6 text-base", icon: "h-10 w-10" };
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], className)} {...props} />;
}
