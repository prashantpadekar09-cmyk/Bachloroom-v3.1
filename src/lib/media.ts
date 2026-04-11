export const DEFAULT_ROOM_IMAGE = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80";

export const DEFAULT_AVATAR_IMAGE = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=60";

export const getDisplayImageUrl = (url: string | null | undefined, fallback: string) => {
  if (!url) return fallback;

  const normalized = url.split("?")[0].toLowerCase();
  if (normalized.endsWith(".pdf")) return fallback;
  return url;
};

