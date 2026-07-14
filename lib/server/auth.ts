import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ApiUser = { id: string; role: "ADMIN" | "DRIVER" };

export async function requireApiUser(adminOnly = false): Promise<ApiUser> {
  const supabase = await createServerSupabaseClient();

  // Keeps the local seed-data preview usable without weakening production.
  if (!supabase && process.env.NODE_ENV !== "production") {
    return { id: "local-preview", role: "ADMIN" };
  }
  if (!supabase) throw new Error("Konfigurasi autentikasi server belum lengkap.");

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("UNAUTHORIZED");

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role,status")
    .eq("id", auth.user.id)
    .single();
  if (profileError || !profile?.status) throw new Error("UNAUTHORIZED");

  const role = profile.role as ApiUser["role"];
  if (adminOnly && role !== "ADMIN") throw new Error("FORBIDDEN");
  return { id: auth.user.id, role };
}

export function authErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  if (message === "UNAUTHORIZED")
    return Response.json({ error: "Sesi pengguna tidak valid." }, { status: 401 });
  if (message === "FORBIDDEN")
    return Response.json({ error: "Akses hanya untuk admin." }, { status: 403 });
  return Response.json({ error: message }, { status: 500 });
}
