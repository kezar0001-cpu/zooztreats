import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { toPublicStoreConfig } from "@/lib/store-config";

export const dynamic = "force-dynamic";

// Public config the cart needs to render the expedite toggle and the lead-time
// estimate. Only non-sensitive delivery/expedite fields are returned.
export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(toPublicStoreConfig(settings));
}
