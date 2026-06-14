# Zooz Treats — Bakery Storefront & Admin

A simple ecommerce site for the **Zooz Treats** home bakery in Montreal.
Prices are in **Canadian dollars (CAD)**.

- **Phase 1** — admin backend: database, authentication, product management,
  image upload, and discount code management.
- **Phase 2** — public one-page storefront: live product menu, cart drawer with
  localStorage persistence, and server-side discount code validation.
- **Phase 3** — Stripe Checkout (CAD), order + order_items records, webhook
  fulfillment, shipping/pickup, and an admin orders dashboard.

## Tech stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Supabase** — Postgres database, Auth, and Storage
- **Stripe Checkout** — hosted payment (CAD, test mode)
- **Zustand** for cart state (persisted to localStorage)
- **Zod** for server-side validation
- Vercel-ready

## Features

**Storefront (`/`)**
- One-page warm, mobile-first bakery landing page
- Product menu loaded live from Supabase (only **active** products; primary image
  or a placeholder), sorted featured → sort_order → name
- Sticky header with cart count, hero, How It Works, trust, and FAQ sections
- Slide-out cart drawer: quantity controls, remove, subtotal, discount code, and
  estimated total — all in CAD. Cart persists across refresh.
- Discount validation via a server API route (the `discount_codes` table is
  never exposed to the browser)
- Checkout is a disabled placeholder ("Secure checkout will be added in Phase 3")

**Admin (`/admin`)**
- Admin authentication via Supabase Auth, restricted to emails in `ADMIN_EMAILS`
- All `/admin` routes protected by middleware **and** server-side guards
- Dashboard with product/discount counts and quick actions
- Product management: create, edit, delete, toggle active, mark featured
- Image upload to Supabase Storage with primary-image selection, reordering, and deletion
- Discount code management: percent / fixed / free shipping, min order, expiry, max redemptions
- **Orders dashboard**: list + detail, customer/shipping info, items, totals, Stripe IDs, and status updates
- Server-side validation on every mutation (frontend validation is not trusted)

**Checkout & orders (Phase 3)**
- Stripe Checkout (hosted, CAD) — no card details touch the site
- Server-side recalculation of subtotal, discount, shipping, and total — frontend totals are never trusted
- Fulfillment: ship within Canada (flat CA$15) or local Montreal pickup (free)
- Stripe coupons created/reused for percent & fixed discounts; `free_shipping` zeroes shipping
- Webhook marks orders paid, stores customer/shipping details, and increments discount redemptions **idempotently** (once per order)

## Routes

| Route | Description |
| --- | --- |
| `/` | Public storefront (live products + cart) |
| `/success` | Order confirmation (after Stripe Checkout) |
| `/api/discount/validate` | POST — server-side discount validation (display only) |
| `/api/checkout` | POST — recalculates cart server-side, creates order + Stripe session |
| `/api/stripe/webhook` | POST — Stripe webhook (marks orders paid, records redemption) |
| `/admin/login` | Admin sign in |
| `/admin` | Dashboard home |
| `/admin/products` | Product list (table on desktop, cards on mobile) |
| `/admin/products/new` | Create a product |
| `/admin/products/[id]/edit` | Edit a product + manage images |
| `/admin/orders` | Orders list |
| `/admin/orders/[id]` | Order detail + status update |
| `/admin/discounts` | Manage discount codes |

## Currency

All prices are stored as integer **cents** and displayed in CAD via
`src/lib/money.ts` (`formatMoney`, `STORE_CURRENCY`, `STORE_STRIPE_CURRENCY`,
`STORE_LOCALE`). `1800` renders as `CA$18.00`; a `500` fixed discount is
`CA$5.00`.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Apply the database schema

There are two migrations in `supabase/migrations/`:

- `0001_init.sql` — creates the `products`, `product_images`, and
  `discount_codes` tables, RLS policies, and the `product-images` Storage bucket.
- `0002_discount_lookup.sql` — adds the `find_discount_code` SECURITY DEFINER
  function used by the storefront to validate a single discount code without
  exposing the `discount_codes` table to anonymous visitors. **Required for the
  storefront discount field to work.**

**Option A — Supabase SQL Editor (quickest):**
Open the SQL Editor in the Supabase dashboard and run them **in order**:
`0001_init.sql`, `0002_discount_lookup.sql`, `0003_orders.sql`,
`0004_order_items_fk.sql`, `0005_order_confirmation_email.sql`,
`0006_order_token.sql`, `0007_discount_redemption_cap.sql`,
`0008_orders_rls_admin.sql`, `0009_product_allergens.sql`, then
`supabase/seed.sql` (starter products and discount codes).

`0003_orders.sql` adds the `orders` and `order_items` tables, an atomic
`increment_discount_redemption` function, and a `stripe_coupon_id` column on
`discount_codes`. **Required for Phase 3 checkout.**

Migrations 0004–0009 add later improvements:

- `0004` — `order_items.product_id` becomes `ON DELETE SET NULL` so products in
  past orders can still be deleted.
- `0005` — `confirmation_email_sent` flag (idempotent order emails).
- `0006` — `order_token` + `get_order_by_token()` for the customer order-status
  page (`/orders/[token]`).
- `0007` — `increment_discount_redemption` now enforces `max_redemptions`
  atomically.
- `0008` — locks `orders`/`order_items` RLS to admins via an `admins` table +
  `is_admin()`. **Seed it to match `ADMIN_EMAILS`**, e.g.
  `insert into public.admins (email) values ('owner@zooztreats.com');`
  (The app reads orders via the service role, so this is defense-in-depth.)
- `0009` — `allergens` column shown on product pages.

**Option B — Supabase CLI (recommended for ongoing work):**

```bash
# Install: https://supabase.com/docs/guides/local-development
supabase login
supabase link --project-ref <your-project-ref>
supabase db push          # applies migrations to the linked project

# Local stack instead of remote:
supabase start
supabase db reset         # applies migrations + seed.sql
```

## 3. Storage bucket

The migration automatically creates a **public** Storage bucket named
`product-images` with policies allowing public reads and authenticated
(admin) writes. No manual setup is required. If you change the bucket name,
update `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`.

## 4. Authentication / create your admin user

Supabase Auth does not create users automatically. Create the bakery owner's
account once:

1. In the Supabase dashboard go to **Authentication → Users → Add user**.
2. Enter the owner's email + a password (or invite by email).
3. Add that same email to `ADMIN_EMAILS` (see below).

> **Tip:** Disable public sign-ups under **Authentication → Providers → Email**
> so only invited admins can have accounts. (The local CLI config already sets
> `enable_signup = false`.)

Only users whose email is in `ADMIN_EMAILS` can access `/admin` — any other
authenticated user is blocked.

## 5. Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

```dotenv
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
ADMIN_EMAILS=owner@zooztreats.com,manager@zooztreats.com
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=product-images

# Server-only secrets (never prefix with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Public Stripe / site
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Transactional email (optional — order confirmations & status updates)
RESEND_API_KEY=re_...
EMAIL_FROM=Zooz Treats <orders@zooztreats.com>
ORDER_NOTIFICATION_EMAIL=owner@zooztreats.com

# Background jobs (abandoned-order cleanup cron)
CRON_SECRET=<random-string>
```

`ADMIN_EMAILS` is a **comma-separated** list of allowed admin emails.

Email is **optional**: if `RESEND_API_KEY` is empty the store works normally but
no confirmation/status emails are sent. The cron secret protects
`/api/cron/reap-pending`, which deletes abandoned `pending` orders hourly
(configured in `vercel.json`).

| Variable | Where to find it | Exposed to browser? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service_role) | **No** |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys | **No** |
| `STRIPE_WEBHOOK_SECRET` | `stripe listen` or Dashboard webhook | **No** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys | Yes |
| `NEXT_PUBLIC_SITE_URL` | Your app URL | Yes |
| `RESEND_API_KEY` | Resend → API Keys (optional) | **No** |
| `EMAIL_FROM` | Verified Resend sender (optional) | **No** |
| `ORDER_NOTIFICATION_EMAIL` | Owner inbox for new orders (optional) | **No** |
| `CRON_SECRET` | Any random string (optional) | **No** |

## 6. Local development

```bash
npm install
npm run dev
# open http://localhost:3000/admin
```

Useful scripts:

```bash
npm run dev         # start dev server
npm run build       # production build
npm run start       # run production build
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
```

## 7. Stripe checkout (Phase 3)

Checkout uses **Stripe Checkout** (hosted) in **CAD**. Card details are never
collected on the site. All prices, discounts, shipping, and totals are
recalculated server-side in `/api/checkout` — frontend values are never trusted.

### Stripe setup

1. Create a Stripe account and stay in **Test mode**.
2. **Developers → API keys**: copy the **Publishable key**
   (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) and **Secret key** (`STRIPE_SECRET_KEY`).
3. Apply migration `0003_orders.sql` (see step 2).

### Webhook setup (local)

Stripe must notify the app when a payment completes. Use the Stripe CLI:

```bash
# Install: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

`stripe listen` prints a signing secret (`whsec_...`) — put it in
`STRIPE_WEBHOOK_SECRET`. Keep `stripe listen` running while testing locally.

### Webhook setup (Vercel / production)

1. **Stripe Dashboard → Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://<your-domain>/api/stripe/webhook`.
3. Subscribe to events: `checkout.session.completed`,
   `checkout.session.expired`, and `charge.refunded` (to sync refunds made from
   the Stripe dashboard).
4. Copy the endpoint's **Signing secret** into `STRIPE_WEBHOOK_SECRET` on Vercel.

> The webhook route is always deployed. If `STRIPE_WEBHOOK_SECRET` is missing it
> returns a clear configuration error only when invoked — it never crashes the app.

### Testing checkout locally

1. `npm run dev` and, in another terminal, run the `stripe listen` command above.
2. Add products to the cart, choose **Ship within Canada** or **Local pickup**,
   optionally apply a code (e.g. `ZOOZ10`, `LOCAL5`), and click **Checkout**.
3. On Stripe Checkout use a test card: `4242 4242 4242 4242`, any future expiry,
   any CVC, any postal code. Confirm the amount shows in **CAD**.
4. After payment you land on `/success`; the order appears in `/admin/orders`,
   and the discount's redemption count increments exactly once.

### Testing checkout on Vercel

1. Set all env vars in **Vercel → Settings → Environment Variables**
   (including `NEXT_PUBLIC_SITE_URL=https://<your-domain>`).
2. Add the production webhook endpoint (above) and set `STRIPE_WEBHOOK_SECRET`.
3. Run a test-mode purchase with the test card and verify the order in
   `/admin/orders`.

## 8. Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add **all** environment variables (from `.env.local`) in
   **Vercel → Project → Settings → Environment Variables**. Set
   `NEXT_PUBLIC_SITE_URL` to your deployed URL.
3. Add the Stripe production webhook endpoint (see step 7).
4. Deploy. The project is configured to allow Supabase Storage image hosts in
   `next.config.mjs`.

---

## Project structure

```
supabase/
  migrations/0001_init.sql            # tables, RLS, storage bucket + policies
  migrations/0002_discount_lookup.sql # find_discount_code() for the storefront
  migrations/0003_orders.sql          # orders, order_items, redemption fn
  migrations/0004_order_items_fk.sql  # ON DELETE SET NULL for product_id
  migrations/0005_order_confirmation_email.sql # email idempotency flag
  migrations/0006_order_token.sql     # order_token + get_order_by_token()
  migrations/0007_discount_redemption_cap.sql  # atomic max_redemptions
  migrations/0008_orders_rls_admin.sql # admins table + is_admin() RLS
  migrations/0009_product_allergens.sql # allergens column
  seed.sql                            # starter products & discount codes
  config.toml                         # local CLI config
src/
  app/
    page.tsx                 # public storefront (one-page store)
    success/                 # order confirmation page
    api/discount/validate/   # POST discount validation (display only)
    api/checkout/            # POST recalc + create order + Stripe session
    api/stripe/webhook/      # POST Stripe webhook (fulfillment)
    auth/signout/route.ts    # sign-out handler
    admin/
      login/                 # public login page + action
      (protected)/           # guarded admin area (route group)
        layout.tsx           # requireAdmin + nav
        page.tsx             # dashboard
        products/            # list, new, [id]/edit + server actions
        orders/              # list, [id] detail + status action
        discounts/           # list/create/edit + server actions
  components/
    admin/                   # reusable admin UI components
    store/                   # Header, Hero, ProductGrid, ProductCard,
                             # CartDrawer, QuantitySelector, DiscountCodeInput,
                             # FAQItem, Footer, ...
  lib/
    supabase/                # browser + server + service-role + middleware
    auth.ts                  # admin guards
    env.ts                   # validated env (incl. server-only secrets)
    money.ts                 # CAD formatting + currency constants
    fulfillment.ts           # shipping/pickup constants + computeShippingCents
    stripe.ts                # server-only Stripe client
    checkout.ts              # server-side cart pricing + Stripe coupons
    products.ts, discounts.ts# data access (read) + discount validation
    orders.ts                # admin order reads
    cart.ts                  # Zustand cart store (persisted)
    storage.ts               # image upload/delete helpers
    validation.ts            # Zod schemas + coercion helpers
    format.ts, types.ts
  types/store.ts             # storefront/cart types
middleware.ts                # session refresh + /admin protection
```

## Security notes

- Admin access is enforced in **two** places: `middleware.ts` (edge) and
  `requireAdmin()` / `assertAdmin()` (server components & actions).
- Row Level Security is enabled on all tables. Public visitors can only read
  **active** products and their images; the `discount_codes` table is never
  exposed to anonymous users. Discount validation goes through the
  `/api/discount/validate` route, which computes everything server-side using
  the `find_discount_code` SECURITY DEFINER function (single-code lookup only —
  the table is not enumerable from the browser). Phase 3 checkout must still
  recalculate discounts server-side before charging.
- The cart lives entirely in the browser (Zustand + localStorage). On load it is
  reconciled against the live product list: items for products that are no longer
  active are dropped, and prices/names/images are refreshed so stale prices
  aren't trusted.
- **Checkout never trusts the client.** `/api/checkout` only accepts product ids,
  quantities, a code, and a fulfillment method. It re-fetches products
  server-side, rejects unknown/inactive products and bad quantities, and
  recomputes subtotal, discount, shipping, and total. Stripe charges those
  server-computed amounts.
- `orders` / `order_items` are **not** readable by anonymous users (RLS). Only
  authenticated admins can read/update orders. Order inserts and webhook updates
  use the **service-role key**, which lives only on the server
  (`src/lib/supabase/admin.ts` is marked `server-only`). The Stripe secret and
  webhook secret are likewise server-only — no private key uses a `NEXT_PUBLIC_`
  prefix, and secrets are never logged.
- The Stripe webhook verifies the signature with `STRIPE_WEBHOOK_SECRET` and is
  idempotent: an order is marked paid once, and a discount's redemption count is
  incremented exactly once via a guarded flag + `service_role`-only function.
- All create/update/delete operations validate input server-side with Zod
  before touching the database.
