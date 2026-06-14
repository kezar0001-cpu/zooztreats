import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

// Lazily-constructed Stripe client (server-only). Constructed on first use so a
// missing key surfaces a clear error at request time rather than at import.
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(env.stripeSecretKey, {
      // Pin to the SDK's default API version.
      typescript: true,
    });
  }
  return stripeClient;
}
