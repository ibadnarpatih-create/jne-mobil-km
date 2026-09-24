export function photoPreviewUrl(url: string, width = 900) {
  if (!url || url.startsWith("data:") || !/^https?:\/\//i.test(url)) return url;
  if (!url.includes("ik.imagekit.io")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}tr=w-${width},q-72,f-auto`;
}
