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
  allergens: z.string().trim().max(1000).optional().or(z.literal("")),
  box_type: z.enum(["standard", "party", "premium"]).nullable().default(null),
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
// Site settings (admin) — one schema per section of the settings page
// ---------------------------------------------------------------------------
const handleField = z
  .string()
  .trim()
  .max(64)
  .regex(/^@?[A-Za-z0-9._-]+$/, "Use letters, numbers, dots, hyphens or underscores.")
  .optional()
  .or(z.literal(""));

export const deliverySettingsSchema = z.object({
  delivery_lead_time_days: z
    .number({ invalid_type_error: "Enter a number of days." })
    .int("Enter a whole number of days.")
    .min(0, "Cannot be negative.")
    .max(365, "That seems too long."),
});

export const expediteSettingsSchema = z
  .object({
    expedite_enabled: z.boolean(),
    expedite_fee_type: z.enum(["fixed", "percent"]),
    expedite_fee_cents: z.number().int().min(0, "Cannot be negative."),
    expedite_fee_percent: z
      .number()
      .int()
      .min(0, "Cannot be negative.")
      .max(100, "Cannot exceed 100%."),
    expedite_lead_time_days: z
      .number({ invalid_type_error: "Enter a number of days." })
      .int()
      .min(0, "Cannot be negative.")
      .max(365, "That seems too long."),
  })
  .superRefine((data, ctx) => {
    if (data.expedite_enabled) {
      if (data.expedite_fee_type === "fixed" && data.expedite_fee_cents <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Set a fee greater than $0.",
          path: ["expedite_fee_cents"],
        });
      }
      if (data.expedite_fee_type === "percent" && data.expedite_fee_percent <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Set a percentage greater than 0.",
          path: ["expedite_fee_percent"],
        });
      }
    }
  });

export const socialSettingsSchema = z.object({
  social_tiktok: handleField,
  social_instagram: handleField,
  social_youtube: handleField,
  social_x: handleField,
});

export const boxOptionSettingsSchema = z.object({
  party_sticker_surcharge_cents: z.number().int().min(0, "Cannot be negative."),
  premium_wax_surcharge_cents: z.number().int().min(0, "Cannot be negative."),
  premium_sticker_surcharge_cents: z.number().int().min(0, "Cannot be negative."),
});

export const policySettingsSchema = z.object({
  terms_content: z.string().max(50000).optional().or(z.literal("")),
  privacy_content: z.string().max(50000).optional().or(z.literal("")),
  refund_content: z.string().max(50000).optional().or(z.literal("")),
});

// ---------------------------------------------------------------------------
// Ribbon colour (admin)
// ---------------------------------------------------------------------------
export const ribbonColourSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(60),
  hex: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a hex colour like #c0392b.")
    .optional()
    .or(z.literal("")),
  surcharge_cents: z.number().int().min(0, "Cannot be negative."),
  active: z.boolean(),
  sort_order: z.number().int().min(0).default(0),
});

export type RibbonColourInput = z.infer<typeof ribbonColourSchema>;

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
