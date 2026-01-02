export function isCloudinaryUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("res.cloudinary.com");
  } catch {
    return false;
  }
}

export function buildCloudinaryCardUrl(url?: string | null): string {
  if (!url || !isCloudinaryUrl(url)) return url ?? "";

  const uploadMarker = "/upload/";
  const idx = url.indexOf(uploadMarker);
  if (idx === -1) return url;

  const prefix = url.slice(0, idx + uploadMarker.length);
  const rest = url.slice(idx + uploadMarker.length);

  const existingParts = rest.split("/");
  const hasTransform =
    existingParts.length > 0 &&
    existingParts[0].includes(",") &&
    !existingParts[0].includes(".");

  const transform = "c_fill,g_auto,w_900,h_900,f_auto,q_auto";

  if (hasTransform) {
    const [, ...remaining] = existingParts;
    return `${prefix}${transform}/${remaining.join("/")}`;
  }

  return `${prefix}${transform}/${rest}`;
}

export function buildCloudinaryUrlFromPublicId(publicId: string, options?: { cloudName?: string }) {
  const cloud = options?.cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
  if (!cloud || !publicId) return "";
  return `https://res.cloudinary.com/${cloud}/image/upload/${publicId}.jpg`;
}
