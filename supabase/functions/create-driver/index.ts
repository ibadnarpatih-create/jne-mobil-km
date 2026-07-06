import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const normalizePhone = (value: string) => value.startsWith("0") ? `+62${value.slice(1)}` : value;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = request.headers.get("Authorization") ?? "";
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = authHeader.replace("Bearer ", ""); const { data: caller } = await admin.auth.getUser(token);
    if (!caller.user) throw new Error("Sesi admin tidak valid");
    const { data: profile } = await admin.from("users").select("role, status").eq("id", caller.user.id).single();
    if (profile?.role !== "ADMIN" || !profile.status) throw new Error("Hanya admin aktif yang dapat menambah driver");

    const body = await request.json();
    const { data, error } = await admin.auth.admin.createUser({ phone: normalizePhone(body.nomor_hp), password: body.password, phone_confirm: true, user_metadata: { nama: body.nama } });
    if (error || !data.user) throw error ?? new Error("Akun gagal dibuat");
    const { data: user, error: profileError } = await admin.from("users").insert({ id: data.user.id, nama: body.nama, nomor_hp: body.nomor_hp, role: "DRIVER", status: body.status ?? true, kendaraan_utama_id: body.kendaraan_utama_id, keterangan: body.keterangan }).select().single();
    if (profileError) { await admin.auth.admin.deleteUser(data.user.id); throw profileError; }
    return new Response(JSON.stringify(user), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Permintaan gagal" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
