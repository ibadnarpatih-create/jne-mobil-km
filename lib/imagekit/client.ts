import { upload } from "@imagekit/next";

type UploadInput = {
  file: string | Blob | File;
  fileName: string;
  folder: string;
  tags?: string[];
  onProgress?: (percentage: number) => void;
};

export async function uploadToImageKit(input: UploadInput) {
  const authResponse = await fetch("/api/imagekit/auth", { cache: "no-store" });
  const auth = (await authResponse.json()) as {
    token?: string;
    expire?: number;
    signature?: string;
    publicKey?: string;
    error?: string;
  };
  if (!authResponse.ok || !auth.token || !auth.expire || !auth.signature || !auth.publicKey)
    throw new Error(auth.error || "Otorisasi upload ImageKit gagal.");

  const result = await upload({
    file: input.file,
    fileName: input.fileName,
    folder: input.folder,
    tags: input.tags,
    token: auth.token,
    expire: auth.expire,
    signature: auth.signature,
    publicKey: auth.publicKey,
    useUniqueFileName: true,
    onProgress: (event) => {
      if (event.total > 0) input.onProgress?.(Math.round((event.loaded / event.total) * 100));
    },
  });
  if (!result.url) throw new Error("ImageKit tidak mengembalikan URL file.");
  return result;
}

export function safeUploadName(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9.-]+/g, "-").replace(/^-+|-+$/g, "") || "file";
}
