/**
 * An embeddable player URL for a pasted video link (YouTube, Vimeo, Loom,
 * Streamable, Google Drive), or null to show it as a plain link instead.
 */
export function videoEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be" && parts[0]) return `https://www.youtube.com/embed/${parts[0]}`;
  if (host === "youtube.com") {
    const id = url.searchParams.get("v") ?? (["shorts", "embed", "live"].includes(parts[0]) ? parts[1] : null);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host === "vimeo.com" && /^\d+$/.test(parts[0] ?? "")) return `https://player.vimeo.com/video/${parts[0]}`;
  if (host === "loom.com" && parts[0] === "share" && parts[1]) return `https://www.loom.com/embed/${parts[1]}`;
  if (host === "streamable.com" && parts[0]) return `https://streamable.com/e/${parts[parts[0] === "e" ? 1 : 0]}`;
  if (host === "drive.google.com" && parts[0] === "file" && parts[2]) {
    return `https://drive.google.com/file/d/${parts[2]}/preview`;
  }
  return null;
}
