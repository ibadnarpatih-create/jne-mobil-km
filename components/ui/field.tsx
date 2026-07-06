import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-2 block text-sm font-semibold text-slate-700", className)} {...props} />;
}
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base outline-none transition placeholder:text-slate-400 focus:border-jne-blue focus:ring-4 focus:ring-blue-50", className)} {...props} />;
}
export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base outline-none focus:border-jne-blue focus:ring-4 focus:ring-blue-50", className)} {...props} />;
}
