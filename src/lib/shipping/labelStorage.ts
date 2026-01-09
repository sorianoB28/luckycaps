import "server-only";

import { Readable } from "stream";

import { cloudinary } from "@/lib/cloudinary";

type LabelUploadResult = {
  asset_url: string;
  public_id: string;
  bytes: number;
};

function validateCloudinaryEnv() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return "Cloudinary env vars are missing.";
  }
  return null;
}

async function fetchLabelBuffer(labelUrl: string) {
  const res = await fetch(labelUrl);
  if (!res.ok) {
    throw new Error(`Label download failed (${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function uploadLabelBufferToCloudinary(params: {
  buffer: Buffer;
  public_id: string;
  folder?: string | null;
}) {
  const envError = validateCloudinaryEnv();
  if (envError) {
    throw new Error(envError);
  }

  const baseId = params.public_id.replace(/\.pdf$/i, "");
  const baseName = baseId.split("/").pop() || baseId;
  const filename = `${baseName}.pdf`;
  const publicIdWithExtension = `${baseId}.pdf`;
  const folder =
    params.folder === undefined ? "luckycaps/shipping-labels" : params.folder;

  const attemptUpload = (options: Record<string, unknown>) =>
    new Promise<LabelUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Label upload failed"));
            return;
          }
          resolve({
            asset_url: String(result.secure_url || ""),
            public_id: String(result.public_id || ""),
            bytes: Number(result.bytes) || 0,
          });
        }
      );

      Readable.from(params.buffer).pipe(uploadStream);
    });

  const withFolder = (options: Record<string, unknown>) => {
    if (folder) {
      return { ...options, folder };
    }
    return options;
  };

  try {
    return await attemptUpload(
      withFolder({
        resource_type: "raw",
        public_id: publicIdWithExtension,
        access_mode: "public",
        overwrite: true,
        unique_filename: false,
        filename_override: filename,
      })
    );
  } catch (err) {
    return attemptUpload(
      withFolder({
        resource_type: "raw",
        public_id: baseId,
        access_mode: "public",
        overwrite: true,
        unique_filename: false,
        format: "pdf",
        filename_override: filename,
      })
    );
  }
}

export async function uploadLabelToCloudinary(params: {
  label_url: string;
  public_id: string;
  folder?: string | null;
}) {
  const buffer = await fetchLabelBuffer(params.label_url);
  return uploadLabelBufferToCloudinary({
    buffer,
    public_id: params.public_id,
    folder: params.folder ?? null,
  });
}
