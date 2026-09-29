export function photoPreviewUrl(url: string, width = 900) {
  if (!url || url.startsWith("data:") || !/^https?:\/\//i.test(url)) return url;
  if (!url.includes("ik.imagekit.io")) return url;
  try {
    const source = new URL(url);
    const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
    if (!endpoint) return url;
    const endpointUrl = new URL(endpoint);
    if (source.hostname !== endpointUrl.hostname) return url;
    const endpointPath = endpointUrl.pathname.replace(/\/$/, "");
    const sourcePath = source.pathname.startsWith(endpointPath + "/")
      ? source.pathname.slice(endpointPath.length)
      : source.pathname;
    const proxyPath = `/media/imagekit${sourcePath}`;
    const query = new URLSearchParams(source.search);
    query.set("tr", `w-${width},q-72,f-auto`);
    return `${proxyPath}?${query.toString()}`;
  } catch {
    return url;
  }
}
