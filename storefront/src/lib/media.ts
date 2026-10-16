const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL ?? "http://localhost:8000";

// ProductImage.image stores a path relative to management-api's MEDIA_ROOT.
export function resolveImageUrl(path: string) {
  return `${MEDIA_BASE_URL}/media/${path}`;
}
