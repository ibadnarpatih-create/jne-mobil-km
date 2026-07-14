const apiBase = "https://api.imagekit.io/v1";

export function getImageKitConfig() {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error(
      "ImageKit belum dikonfigurasi. Isi IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, dan NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT.",
    );
  }
  return { publicKey, privateKey, urlEndpoint: urlEndpoint.replace(/\/$/, "") };
}

function imageKitHeaders() {
  const { privateKey } = getImageKitConfig();
  return { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` };
}

async function imageKitRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { ...imageKitHeaders(), ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ImageKit ${response.status}: ${body || response.statusText}`);
  }
  return response;
}

export async function listImageKitFiles(input: {
  skip: number;
  limit: number;
  name?: string;
}) {
  const query = new URLSearchParams({
    type: "file",
    path: "/movetra/",
    skip: String(input.skip),
    limit: String(input.limit),
    sort: "DESC_CREATED",
  });
  if (input.name) query.set("name", input.name);
  const response = await imageKitRequest(`/files?${query}`);
  return response.json();
}

export async function deleteImageKitFile(fileId: string) {
  await imageKitRequest(`/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
}
