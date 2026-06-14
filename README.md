# Zooz Treats — Bakery Storefront & Admin

A simple ecommerce site for the **Zooz Treats** home bakery in Montreal.
Prices are in **Canadian dollars (CAD)**.

- **Phase 1** — admin backend: database, authentication, product management,
  image upload, and discount code management.
- **Phase 2** — public one-page storefront: live product menu, cart drawer with
  localStorage persistence, and server-side discount code validation.
- **Phase 3 (not yet built)** — Stripe checkout.

## Tech stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Supabase** — Postgres database, Auth, and Storage
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
- Server-side validation on every mutation (frontend validation is not trusted)

## Routes

| Route | Description |
| --- | --- |
| `/` | Public storefront (live products + cart) |
| `/api/discount/validate` | POST — server-side discount validation (display only) |
| `/admin/login` | Admin sign in |
| `/admin` | Dashboard home |
| `/admin/products` | Product list (table on desktop, cards on mobile) |
| `/admin/products/new` | Create a product |
| `/admin/products/[id]/edit` | Edit a product + manage images |
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
Open the SQL Editor in the Supabase dashboard and run, in order:
`0001_init.sql`, then `0002_discount_lookup.sql`, then `supabase/seed.sql`
(starter products and discount codes).

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
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
ADMIN_EMAILS=owner@zooztreats.com,manager@zooztreats.com
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=product-images
```

`ADMIN_EMAILS` is a **comma-separated** list of allowed admin emails.

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

## 7. Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add the same environment variables (from `.env.local`) in
   **Vercel → Project → Settings → Environment Variables**.
3. Deploy. The project is configured to allow Supabase Storage image hosts in
   `next.config.mjs`.

---

## Project structure

```
supabase/
  migrations/0001_init.sql            # tables, RLS, storage bucket + policies
  migrations/0002_discount_lookup.sql # find_discount_code() for the storefront
  seed.sql                            # starter products & discount codes
  config.toml                         # local CLI config
src/
  app/
    page.tsx                 # public storefront (one-page store)
    api/discount/validate/   # POST discount validation (display only)
    auth/signout/route.ts    # sign-out handler
    admin/
      login/                 # public login page + action
      (protected)/           # guarded admin area (route group)
        layout.tsx           # requireAdmin + nav
        page.tsx             # dashboard
        products/            # list, new, [id]/edit + server actions
        discounts/           # list/create/edit + server actions
  components/
    admin/                   # reusable admin UI components
    store/                   # Header, Hero, ProductGrid, ProductCard,
                             # CartDrawer, QuantitySelector, DiscountCodeInput,
                             # FAQItem, Footer, ...
  lib/
    supabase/                # browser + server clients, middleware helper
    auth.ts                  # admin guards
    env.ts                   # validated env + ADMIN_EMAILS parsing
    money.ts                 # CAD formatting + currency constants
    products.ts, discounts.ts# data access (read) + discount validation
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
- No service-role key is used or exposed to the browser; only the public anon key
  is needed.
- All create/update/delete operations validate input server-side with Zod
  before touching the database.
