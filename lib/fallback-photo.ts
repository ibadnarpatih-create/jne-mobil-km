import type { SupabaseClient } from "@supabase/supabase-js";

export async function uploadFallbackPhoto(
  supabase: SupabaseClient | null,
  dataUrl: string,
  bucket: string,
  path: string,
) {
  if (!supabase || !dataUrl.startsWith("data:")) return null;
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return path;
}
