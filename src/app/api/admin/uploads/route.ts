import { NextResponse } from "next/server";
import { Readable } from "stream";

import { requireAdmin } from "@/lib/adminAuth";
import { cloudinary } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UploadResult = {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function validateEnv() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET ||
    !process.env.CLOUDINARY_UPLOAD_PRESET
  ) {
    return "Cloudinary env vars are missing.";
  }
  return null;
}

async function uploadToCloudinary(file: File): Promise<UploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer());

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "luckycaps/products",
        resource_type: "image",
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Upload failed"));
          return;
        }
        resolve(result as UploadResult);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

export async function POST(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const envError = validateEnv();
  if (envError) {
    return NextResponse.json({ error: envError }, { status: 500 });
  }

  const formData = await request.formData();
  const files = [
    ...formData.getAll("files"),
    ...formData.getAll("file"),
  ].filter((f): f is File => f instanceof File);

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const invalid = files.find(
    (file) => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_SIZE
  );
  if (invalid) {
    return NextResponse.json(
      { error: "Invalid file type or size (max 5MB; jpeg/png/webp/avif only)" },
      { status: 400 }
    );
  }

  try {
    const uploads = await Promise.all(files.map(uploadToCloudinary));
    return NextResponse.json({
      images: uploads.map((u) => ({
        url: u.secure_url,
        publicId: u.public_id,
        width: u.width,
        height: u.height,
        format: u.format,
        bytes: u.bytes,
      })),
    });
  } catch (err) {
    console.error("Cloudinary upload failed", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
