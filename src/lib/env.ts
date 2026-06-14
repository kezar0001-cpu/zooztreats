// Centralized, validated access to environment variables.

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Add it to your .env.local (see .env.example).`,
    );
  }
  return value;
}

export const env = {
  get supabaseUrl(): string {
    return required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
  },
  get supabaseAnonKey(): string {
    return required(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
  get storageBucket(): string {
    return process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "product-images";
  },

  // --- Server-only secrets (never exposed to the browser) ---
  get supabaseServiceRoleKey(): string {
    return required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  },
  get stripeSecretKey(): string {
    return required("STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY);
  },
  get stripeWebhookSecret(): string {
    return required(
      "STRIPE_WEBHOOK_SECRET",
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  },

  // --- Public values ---
  get stripePublishableKey(): string {
    return required(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    );
  },
  // Base URL for building Stripe success/cancel URLs. Falls back to the request
  // origin when not set.
  get siteUrl(): string | undefined {
    return process.env.NEXT_PUBLIC_SITE_URL?.trim() || undefined;
  },

  // --- Transactional email (optional) ---
  // When RESEND_API_KEY is unset, email sending is skipped gracefully so the
  // store keeps working without an email provider configured.
  get resendApiKey(): string | undefined {
    return process.env.RESEND_API_KEY?.trim() || undefined;
  },
  // "From" address for outbound email. Must be a verified Resend sender/domain
  // in production. Defaults to Resend's shared sandbox sender for local testing.
  get emailFrom(): string {
    return (
      process.env.EMAIL_FROM?.trim() || "Zooz Treats <onboarding@resend.dev>"
    );
  },
  // Owner/operator address that receives a copy of every new paid order.
  get orderNotificationEmail(): string | undefined {
    return process.env.ORDER_NOTIFICATION_EMAIL?.trim() || undefined;
  },

  // --- Background jobs ---
  // Shared secret guarding scheduled cron routes.
  get cronSecret(): string | undefined {
    return process.env.CRON_SECRET?.trim() || undefined;
  },
};

// Parse ADMIN_EMAILS into a normalized lowercase list.
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}
