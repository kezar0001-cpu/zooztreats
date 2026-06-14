import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared coercion helpers
// ---------------------------------------------------------------------------

// Parse a price string like "18", "18.00", "$18.50" into integer cents.
export function dollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------
export const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(200)
    .regex(slugRegex, "Slug may only contain lowercase letters, numbers and hyphens."),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  price_cents: z
    .number({ invalid_type_error: "Price is required." })
    .int("Price must be a whole number of cents.")
    .min(0, "Price cannot be negative."),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  prep_time_note: z.string().trim().max(500).optional().or(z.literal("")),
  active: z.boolean(),
  featured: z.boolean(),
  sort_order: z.number().int().min(0).default(0),
});

export type ProductInput = z.infer<typeof productSchema>;

// ---------------------------------------------------------------------------
// Discount code
// ---------------------------------------------------------------------------
export const discountSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Code is required.")
      .max(50)
      .regex(/^[A-Z0-9_-]+$/, "Code may only contain A-Z, 0-9, hyphen and underscore."),
    type: z.enum(["percent", "fixed", "free_shipping"], {
      errorMap: () => ({ message: "Choose a valid discount type." }),
    }),
    value: z
      .number({ invalid_type_error: "Value is required." })
      .int("Value must be a whole number.")
      .min(0, "Value cannot be negative."),
    active: z.boolean(),
    min_order_cents: z.number().int().min(0).default(0),
    max_redemptions: z
      .number()
      .int()
      .min(0)
      .nullable()
      .optional(),
    expires_at: z.string().trim().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "percent" && data.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percent discounts cannot exceed 100.",
        path: ["value"],
      });
    }
  });

export type DiscountInput = z.infer<typeof discountSchema>;

// ---------------------------------------------------------------------------
// Image upload constraints
// ---------------------------------------------------------------------------
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_IMAGE_EXTENSIONS = "JPEG, PNG or WEBP";
export const MAX_IMAGE_MB = 8;
