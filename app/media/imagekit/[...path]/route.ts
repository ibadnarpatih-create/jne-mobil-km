import { getImageKitConfig } from "@/lib/imagekit/server";

export const runtime = "nodejs";

const allowedPath = /^\/(?:movetra|dashboard-photos|fuel-photos)(?:\/|$)/;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const path = requestUrl.pathname.replace(/^\/media\/imagekit/, "") || "/";

  if (!allowedPath.test(path) || path.includes("..")) {
    return new Response("Invalid media path", { status: 400 });
  }

  try {
    const { urlEndpoint } = getImageKitConfig();
    const upstream = new URL(`${urlEndpoint}${path}`);
    upstream.search = requestUrl.search;
    const response = await fetch(upstream, {
      headers: { Accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
      next: { revalidate: 3600 },
    });

    if (!response.ok || !response.body) {
      return new Response("Media unavailable", { status: response.status || 502 });
    }

    const headers = new Headers();
    const contentType = response.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    headers.set("cache-control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return new Response(response.body, { status: 200, headers });
  } catch {
    return new Response("Media proxy unavailable", { status: 502 });
  }
}
