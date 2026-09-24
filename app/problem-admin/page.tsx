"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, PackageSearch } from "lucide-react";
import { useDemoStore } from "@/lib/demo-store";
import { ProblemItemsPanel } from "@/components/problem-items-panel";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function ProblemAdminPage() {
  const router = useRouter();
  const store = useDemoStore();
  useEffect(() => {
    if (store.hydrated && (!store.currentUser || store.currentUser.role !== "ADMIN_PROBLEM")) router.replace("/");
  }, [store.hydrated, store.currentUser, router]);
  if (!store.hydrated || !store.currentUser || store.currentUser.role !== "ADMIN_PROBLEM") return <div className="grid min-h-dvh place-items-center text-sm text-slate-500">Menyiapkan dashboard…</div>;
  return <main className="min-h-dvh bg-jne-pale"><header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-7"><Brand /><div className="flex items-center gap-2"><span className="hidden text-sm font-semibold text-slate-600 sm:block">Admin Barang Problem</span><Button variant="ghost" onClick={() => { void store.logout(); router.replace("/"); }}><LogOut className="h-4 w-4" /> Keluar</Button></div></header><div className="mx-auto max-w-7xl p-4 sm:p-8"><div className="mb-6 flex items-center gap-3 rounded-2xl bg-[#075b57] p-5 text-white"><PackageSearch className="h-8 w-8" /><div><p className="text-lg font-extrabold">Pusat Barang Problem</p><p className="text-sm text-teal-100">Tampilan khusus pencatatan kiriman tanpa resi atau alamat terlepas.</p></div></div><ProblemItemsPanel /></div></main>;
}
