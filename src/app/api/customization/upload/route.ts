import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_MB,
} from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "customization-uploads";

// Customer-facing endpoint (pre-payment) for uploading a sticker design on a
// party / premium box. Uses the service-role client to write to the
// customization-uploads bucket; the file is validated server-side (never trust
// the client). Returns the public URL + storage path, which the cart carries
// through checkout onto the order line.
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please choose a file." }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `That file is larger than ${MAX_IMAGE_MB} MB.` },
      { status: 400 },
    );
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return NextResponse.json(
      { error: `Unsupported file type. Please upload a ${ALLOWED_IMAGE_EXTENSIONS}.` },
      { status: 400 },
    );
  }

  const ext = (
    file.name.includes(".")
      ? file.name.split(".").pop()!
      : file.type.split("/").pop() || "bin"
  ).toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) {
    console.error("[customization upload] failed:", error.message);
    return NextResponse.json(
      { error: "We couldn't upload your design. Please try again." },
      { status: 500 },
    );
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
