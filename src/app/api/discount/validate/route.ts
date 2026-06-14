import { NextResponse } from "next/server";
import { validateDiscountCode } from "@/lib/discounts";
import type { DiscountValidation } from "@/types/store";

export const dynamic = "force-dynamic";

// POST /api/discount/validate
// Body: { code: string, subtotal_cents: number }
// Returns DiscountValidation. For display only — checkout (Phase 3) must
// recalculate discounts server-side before charging.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { valid: false, message: "Invalid request.", discount_cents: 0 } satisfies DiscountValidation,
      { status: 400 },
    );
  }

  const { code, subtotal_cents } = (body ?? {}) as {
    code?: unknown;
    subtotal_cents?: unknown;
  };

  if (typeof code !== "string") {
    return NextResponse.json(
      { valid: false, message: "A code is required.", discount_cents: 0 } satisfies DiscountValidation,
      { status: 400 },
    );
  }

  const subtotal =
    typeof subtotal_cents === "number"
      ? subtotal_cents
      : Number(subtotal_cents);

  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return NextResponse.json(
      { valid: false, message: "Invalid cart subtotal.", discount_cents: 0 } satisfies DiscountValidation,
      { status: 400 },
    );
  }

  const result = await validateDiscountCode(code, Math.round(subtotal));
  return NextResponse.json(result satisfies DiscountValidation);
}
