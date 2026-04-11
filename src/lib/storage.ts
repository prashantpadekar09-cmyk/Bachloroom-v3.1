import { supabase } from "@/integrations/supabase/client";

const DEFAULT_BUCKET_CANDIDATES = ["uploads", "media", "payment-screenshots"];
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;

const resizeImage = async (file: File) => {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= 1.5 * 1024 * 1024) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8)
  );

  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
};

const isBucketNotFoundError = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes("bucket not found") || normalized.includes("not found");
};

type UploadPublicFileArgs = {
  path: string;
  file: File;
  bucketCandidates?: string[];
};

export const uploadPublicFile = async ({ path, file, bucketCandidates }: UploadPublicFileArgs) => {
  const candidates = bucketCandidates?.length ? bucketCandidates : DEFAULT_BUCKET_CANDIDATES;
  let lastError: string | null = null;
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      error: "File too large. Please upload a file under 8 MB.",
      publicUrl: null as string | null,
      bucket: null as string | null,
    };
  }

  const fileToUpload = await resizeImage(file);

  for (const bucket of candidates) {
    const { error } = await supabase.storage.from(bucket).upload(path, fileToUpload, { upsert: true });
    if (error) {
      lastError = error.message;
      if (isBucketNotFoundError(error.message)) {
        continue;
      }
      return { error: error.message, publicUrl: null as string | null, bucket: null as string | null };
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { error: null, publicUrl: data.publicUrl, bucket };
  }

  return {
    error:
      lastError ||
      "Upload bucket not found. Please create one of these buckets: uploads, media, payment-screenshots.",
    publicUrl: null as string | null,
    bucket: null as string | null,
  };
};
