# Zooz Treats — Admin Backend (Phase 1)

A simple ecommerce backend and admin dashboard for the **Zooz Treats** home
bakery. Phase 1 covers the database, authentication, product management, image
upload, and discount code management. (Stripe checkout and the customer-facing
storefront come in later phases.)

## Tech stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Supabase** — Postgres database, Auth, and Storage
- **Zod** for server-side validation
- Vercel-ready

## Features

- Admin authentication via Supabase Auth, restricted to emails in `ADMIN_EMAILS`
- All `/admin` routes protected by middleware **and** server-side guards
- Dashboard with product/discount counts and quick actions
- Product management: create, edit, delete, toggle active, mark featured
- Image upload to Supabase Storage with primary-image selection, reordering, and deletion
- Discount code management: percent / fixed / free shipping, min order, expiry, max redemptions
- Server-side validation on every mutation (frontend validation is not trusted)
- Loading, error, and success states throughout

## Routes

| Route | Description |
| --- | --- |
| `/` | Placeholder store landing page |
| `/admin/login` | Admin sign in |
| `/admin` | Dashboard home |
| `/admin/products` | Product list (table on desktop, cards on mobile) |
| `/admin/products/new` | Create a product |
| `/admin/products/[id]/edit` | Edit a product + manage images |
| `/admin/discounts` | Manage discount codes |

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Apply the database schema

The schema lives in `supabase/migrations/0001_init.sql`. It creates the
`products`, `product_images`, and `discount_codes` tables, RLS policies, and the
`product-images` Storage bucket.

**Option A — Supabase SQL Editor (quickest):**
Open the SQL Editor in the Supabase dashboard, paste the contents of
`supabase/migrations/0001_init.sql`, and run it. Then paste and run
`supabase/seed.sql` to add the starter products and discount codes.

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
  migrations/0001_init.sql   # tables, RLS, storage bucket + policies
  seed.sql                   # starter products & discount codes
  config.toml                # local CLI config
src/
  app/
    page.tsx                 # store landing placeholder
    auth/signout/route.ts    # sign-out handler
    admin/
      login/                 # public login page + action
      (protected)/           # guarded admin area (route group)
        layout.tsx           # requireAdmin + nav
        page.tsx             # dashboard
        products/            # list, new, [id]/edit + server actions
        discounts/           # list/create/edit + server actions
  components/admin/          # reusable admin UI components
  lib/
    supabase/                # browser + server clients, middleware helper
    auth.ts                  # admin guards
    env.ts                   # validated env + ADMIN_EMAILS parsing
    products.ts, discounts.ts# data access (read)
    storage.ts               # image upload/delete helpers
    validation.ts            # Zod schemas + coercion helpers
    format.ts, types.ts
middleware.ts                # session refresh + /admin protection
```

## Security notes

- Admin access is enforced in **two** places: `middleware.ts` (edge) and
  `requireAdmin()` / `assertAdmin()` (server components & actions).
- Row Level Security is enabled on all tables. Public visitors can only read
  **active** products and their images (for the future storefront); discount
  codes are never exposed to anonymous users. Authenticated admins have full
  access. Because admin accounts are gated by `ADMIN_EMAILS` and public
  sign-ups should be disabled, only the owner can authenticate.
- All create/update/delete operations validate input server-side with Zod
  before touching the database.
