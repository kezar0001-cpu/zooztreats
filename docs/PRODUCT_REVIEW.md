# Zooz Treats — Full Product Review & Improvement Roadmap

_Reviewed: 2026-06-14 · Scope: backend + frontend workflows, usability, reliability, data flow, UX, and visual design against industry best practices._

This document is **diagnosis and direction only** — no code has been changed.
It ends with a set of **copy-paste prompts** you can hand directly to a coding
agent, one improvement at a time.

---

## 1. What the product is today

A small, well-built Next.js 15 (App Router) bakery storefront + admin for a
Montreal home bakery, prices in CAD.

- **Storefront (`/`)** — one-page landing: header, hero, live product menu,
  How It Works, trust, FAQ, footer, and a slide-out cart drawer. Cart persists
  in `localStorage` via Zustand. Discount codes validated server-side. Checkout
  hands off to Stripe Checkout (hosted).
- **Admin (`/admin`)** — Supabase Auth gated by `ADMIN_EMAILS`, protected by
  middleware **and** server guards. Dashboard, product CRUD + image management,
  discount CRUD, and an orders list/detail with status updates.
- **Backend** — Supabase Postgres + Storage + RLS; Stripe Checkout & webhook;
  all money recalculated server-side (client totals never trusted). Integer
  cents throughout.

**Overall quality is high for an MVP.** The security posture (server-side
re-pricing, RLS, service-role isolation, idempotent webhook) is notably good.
The gaps below are mostly about *completing workflows*, *operator visibility*,
and *interaction polish* — not foundational rewrites.

---

## 2. End-to-end workflow diagnosis

### 2.1 Customer purchase journey
`Land → browse menu → add to cart → open drawer → choose fulfillment → apply
code → checkout → Stripe → /success`

**Works well:** add-to-cart feedback ("Added ✓"), drawer with live re-pricing,
discount re-validation on subtotal change, server-authoritative checkout, cart
cleared only after success.

**Friction / gaps:**
- **No post-purchase confirmation email.** `/success` says "You will receive
  confirmation shortly," but nothing sends it. This is a broken promise and the
  single biggest customer-trust gap.
- **Cancelled checkout is a dead end.** Stripe `cancel_url` returns to
  `/?checkout=cancelled`, but the homepage never reads that param — no message,
  no re-opened cart. The user lands back on the page unsure what happened.
- **No order lookup / status for the customer.** Once redirected, there is no
  "view your order" or status link. For a made-to-order bakery (prep time,
  pickup) customers will want to know "is it ready?"
- **No product detail page.** `slug` exists but there is no `/products/[slug]`
  route — no shareable/SEO-friendly product URLs, no room for multiple images,
  ingredients, or allergen info (important for food).
- **No category filtering or search.** `category` is captured and shown as a
  pill but is never a filter, even though the menu may grow.
- **Mobile navigation is missing.** Section nav links are `hidden sm:flex`; on
  phones there is no way to jump to Menu/FAQ — only the logo and cart show.

### 2.2 Admin operations journey
`Login → dashboard → manage products/images → manage discounts → fulfill orders`

**Works well:** clean CRUD, slug auto-generation, server-side file validation,
image primary/reorder, idempotent redemption counting, sensible empty states.

**Friction / gaps:**
- **Dashboard ignores the business.** It shows product/discount counts only —
  **no orders, no revenue, no "needs attention" queue.** The operator's first
  screen omits the most important data (today's orders, pending fulfilment,
  sales).
- **Orders list does not scale.** `getOrders()` selects *all* orders with no
  filter, search, status tab, date range, or pagination. Fine at 10 orders,
  unusable at 500.
- **Status changes are invisible to customers.** Marking an order
  "preparing/ready" updates a column but never notifies the buyer.
- **"Refunded" is a label, not an action.** The status dropdown can set
  `refunded`/`cancelled`, but no Stripe refund is issued — risk of the record
  disagreeing with reality.
- **No image upload on product create.** You must save first, then get
  redirected to edit to add images — a two-step that's easy to abandon.
- **Inconsistent action feedback.** Delete has a pending state; Activate/
  Deactivate and discount on/off are plain buttons that do a full page round
  trip with no spinner or optimistic update.

### 2.3 Data-flow integrity
- Cart → checkout sends only `{product_id, quantity}`; server re-prices. ✅
- Discount evaluated identically for display and charge (`evaluateDiscount`). ✅
- Pending order created before Stripe, deleted on error, finalized in webhook. ✅
- **Orphaned pending orders** accumulate when a user abandons Stripe without the
  session expiring — only `checkout.session.expired` cleans them, which can be
  ~24h later. No reaping job.
- **`order_items.product_id` has no `ON DELETE` rule** → deleting a product that
  appears in any order will **fail with a foreign-key violation** (the admin
  Delete button errors). `product_name` is already snapshotted, so the FK should
  be `ON DELETE SET NULL`.
- **`max_redemptions` race:** validated at checkout creation but only counted in
  the webhook; concurrent buyers can exceed the cap.

---

## 3. Prioritized recommendations

Priority key: **P0** = launch-blocking/trust, **P1** = high value, **P2** = polish.

### Group 1 — Core Functionality Gaps

| # | Priority | Recommendation |
|---|----------|----------------|
| 1.1 | **P0** | **Order confirmation email.** Send the buyer (and owner) an email on `checkout.session.completed`. |
| 1.2 | **P0** | **Fix product deletion FK.** Change `order_items.product_id` to `ON DELETE SET NULL` so sold products can be deleted/archived. |
| 1.3 | **P1** | **Customer order status page.** A tokenized `/orders/[token]` (or session-id) read-only status view, linked from `/success` and emails. |
| 1.4 | **P1** | **Orders on the dashboard.** Revenue (paid), order counts by status, and a "recent orders / needs fulfilment" list. |
| 1.5 | **P1** | **Real refunds.** Issue a Stripe refund from the admin when status → refunded, then sync `payment_status`. |
| 1.6 | **P2** | **Product detail pages + allergens/ingredients** at `/products/[slug]` for SEO, sharing, and food-safety info. |
| 1.7 | **P2** | **Inventory / "sold out".** Optional per-product stock or a manual "sold out" flag distinct from inactive. |

**Intended behavior / path for the P0/P1 items**

- **1.1 Confirmation email** — *Behavior:* on paid webhook, email order summary
  to customer + owner. *Path:* add a transactional email provider (Resend is the
  simplest with Next/Vercel). *Backend:* `sendOrderEmail()` called in the
  webhook after the order is marked paid (guard with the same idempotency flag so
  retries don't double-send); add `RESEND_API_KEY` + `ORDER_NOTIFICATION_EMAIL`
  env vars. *Frontend:* none.
- **1.2 FK fix** — *Behavior:* deleting a product never errors; historical order
  line items keep `product_name`. *Path:* new migration
  `alter table order_items drop constraint ... ; add ... references products(id)
  on delete set null;`. *Backend only.* Consider an **archive (set inactive)**
  pattern instead of hard delete for products that have orders.
- **1.3 Customer status page** — *Behavior:* customer follows a link to see
  items, total, fulfillment, and current status. *Path:* add `order_token uuid`
  to `orders`; return it on `/success?session_id=...` lookup; render a read-only
  page. *Backend:* token column + a narrow public RPC/route that returns only
  safe fields for a valid token. *Frontend:* `/orders/[token]` page + link on
  `/success` and in the email.
- **1.4 Dashboard orders** — *Behavior:* operator sees money + work to do first.
  *Path:* add `getOrderStats()` (counts grouped by status, sum of paid totals)
  and a recent-orders query. *Backend:* aggregate queries (or a view).
  *Frontend:* new stat cards + recent list on `/admin`.
- **1.5 Refunds** — *Behavior:* one click refunds via Stripe and records it.
  *Path:* a `refundOrder` server action calling
  `stripe.refunds.create({ payment_intent })`, then set
  `payment_status='refunded'`. *Backend:* server action + webhook handling of
  `charge.refunded` for refunds initiated in Stripe. *Frontend:* a confirm-gated
  Refund button on order detail.

### Group 2 — Workflow / Process Enhancements

| # | Priority | Recommendation |
|---|----------|----------------|
| 2.1 | **P1** | **Cancelled-checkout handling.** Read `?checkout=cancelled`, show a toast/banner, keep the cart, optionally re-open the drawer. |
| 2.2 | **P1** | **Orders filtering & pagination.** Status tabs (pending/paid/preparing/ready/completed), email search, date range, page through results. |
| 2.3 | **P1** | **Status-change notifications.** Email the customer on "ready"/"completed" (esp. pickup). |
| 2.4 | **P2** | **Image upload during product create** (single combined flow, or auto-stay on edit with a clear "Step 2: add photos"). |
| 2.5 | **P2** | **Pending-order reaper.** Scheduled cleanup of stale `pending` orders (Vercel Cron) instead of waiting for Stripe expiry. |
| 2.6 | **P2** | **Atomic redemption cap.** Enforce `max_redemptions` inside `increment_discount_redemption` (conditional update) and re-check at webhook time. |

**Notes / path**
- **2.1** Frontend-only: a small client component on the homepage reads the param
  (or a `cancel`-aware wrapper) and renders a dismissible banner + `openCart()`.
- **2.2** Backend: parameterize `getOrders({status, q, from, to, page})` with
  `.range()` + `.ilike('customer_email', …)`; the existing status indexes help.
  Frontend: tab bar + search input + pager, all driven by URL search params
  (keeps it server-rendered and shareable).
- **2.3** Reuse the 1.1 email plumbing; trigger from `updateOrderStatus`.
- **2.5** A `/api/cron/reap-pending` route guarded by a secret, scheduled in
  `vercel.json`, deleting `pending` orders older than N hours.
- **2.6** Make the RPC `update … where redemption_count < max_redemptions`
  return the new count and treat "no row updated" as cap reached.

### Group 3 — UI/UX Layout & Interaction Improvements

| # | Priority | Recommendation |
|---|----------|----------------|
| 3.1 | **P1** | **Cart drawer accessibility:** focus trap, move focus into the drawer on open, return focus to the trigger on close, label the overlay. |
| 3.2 | **P1** | **Mobile menu navigation.** A hamburger/sheet so phone users can reach Menu/How It Works/FAQ. |
| 3.3 | **P1** | **Consistent loading/disabled states** on all admin mutation buttons (Activate, discount On/Off, status update) — match the Delete pattern. |
| 3.4 | **P2** | **Admin active-nav highlighting** (current section indicator) for orientation. |
| 3.5 | **P2** | **Toast system** to replace inline-only success/error and `window.confirm`, for consistent, non-blocking feedback across store + admin. |
| 3.6 | **P2** | **Empty/zero states with next steps** on dashboard ("No orders yet — share your store link"). |
| 3.7 | **P2** | **SEO & social metadata:** Open Graph/Twitter tags, favicon, `metadataBase`, JSON-LD `Product`/`Bakery`, sitemap/robots. |
| 3.8 | **P2** | **Visual hierarchy on the menu:** clearer featured treatment (badge/ordering is computed but not visually distinguished on the card). |

**Notes / path**
- **3.1** Frontend-only; consider a tiny focus-trap util or `inert` on the
  background. Highest accessibility ROI.
- **3.2** Frontend-only; a `useState` disclosure + slide-down panel reusing the
  existing `NAV` array.
- **3.3** Wrap the plain `<button>`s in the existing `SubmitButton` (already
  supports pending text) or convert toggles to `useActionState`/optimistic.

### Group 4 — Technical Performance / State-Management Issues

| # | Priority | Recommendation |
|---|----------|----------------|
| 4.1 | **P1** | **Debounce discount re-validation.** The effect refetches `/api/discount/validate` on *every* quantity tick; debounce (~400ms) and cancel in-flight. |
| 4.2 | **P1** | **Storefront caching.** `/` is `force-dynamic` (DB hit every visit). Use tag-based revalidation (`revalidateTag('products')` from product mutations) or short `revalidate` to cut load and TTFB. |
| 4.3 | **P2** | **Single product-count query.** Dashboard runs two `count` queries; one grouped query (or a view) suffices. |
| 4.4 | **P2** | **Tighten orders RLS.** Policies are `to authenticated using(true)` — any authenticated Supabase user can read/update all orders. Gate by an admin allowlist/claim in the policy, not just the app layer. |
| 4.5 | **P2** | **Rate-limit public APIs** (`/api/discount/validate`, `/api/checkout`) to deter abuse/coupon brute-forcing. |
| 4.6 | **P2** | **Stripe API version pinning & typed metadata** to avoid drift; centralize the loose `shipping_details` shape. |

**Notes / path**
- **4.1** Frontend-only; debounce inside the `CartDrawer` effect.
- **4.2** Switch `getActiveProducts` reads to a cached fetch tagged `products`,
  and call `revalidateTag('products')` in product create/update/delete/toggle
  + image actions (replacing/augmenting the current `revalidatePath`).
- **4.4** Add a SQL `is_admin()` helper (checks a claim or an `admins` table) and
  use it in the orders policies — defense in depth even though signups are closed.

---

## 4. Suggested sequencing

1. **Trust & correctness (P0):** 1.1 email, 1.2 FK fix.
2. **Operator visibility (P1):** 1.4 dashboard orders, 2.2 orders filtering,
   1.5 refunds.
3. **Customer loop (P1):** 1.3 status page, 2.1 cancelled-checkout, 2.3
   notifications.
4. **Interaction polish (P1):** 3.1 cart a11y, 3.2 mobile nav, 3.3 loading
   states, 4.1 debounce, 4.2 caching.
5. **Everything else (P2)** as capacity allows.

---

## 5. Copy-paste follow-up prompts for coding agents

Each prompt is self-contained. Run them one at a time, in the order above for
best results. They assume the existing stack (Next 15 App Router, Supabase,
Stripe, Zustand, Tailwind) and the conventions already in the repo.

> **P0 — Order confirmation email**
> "Add transactional order emails to Zooz Treats. On the Stripe webhook
> `checkout.session.completed`, after the order is marked paid, send an order
> confirmation email to the customer and a notification to the store owner,
> using Resend. Add `RESEND_API_KEY` and `ORDER_NOTIFICATION_EMAIL` to
> `.env.example` and `src/lib/env.ts`. Create `src/lib/email.ts` with a
> `sendOrderConfirmation(order, items)` helper and call it from
> `src/app/api/stripe/webhook/route.ts`. Make sending idempotent (reuse the
> existing once-per-order guard so Stripe retries never double-send) and never
> let an email failure break the webhook 200. Include item list, totals in CAD
> via `formatMoney`, and fulfillment details."

> **P0 — Fix product-deletion foreign key**
> "Create a new Supabase migration `supabase/migrations/0004_order_items_fk.sql`
> that changes `order_items.product_id` to `references products(id) on delete set
> null`. This must let admins delete a product that appears in past orders
> without a foreign-key error, while preserving each line item's snapshotted
> `product_name`. Also update the admin product Delete flow in
> `src/app/admin/(protected)/products/actions.ts` to surface a friendly error if
> deletion still fails, and add an 'Archive (deactivate)' note in the UI as the
> preferred action for products with order history."

> **P1 — Orders & revenue on the admin dashboard**
> "Enhance the admin dashboard (`src/app/admin/(protected)/page.tsx`). Add a
> `getOrderStats()` function in `src/lib/orders.ts` returning total paid revenue,
> counts by `order_status`, and the 5 most recent orders. Render new stat cards
> (Revenue, Pending fulfilment, Orders today) above the existing product/discount
> cards, plus a 'Recent orders' list linking to each order detail. Keep the
> existing visual style (`admin-card`, `formatMoney`)."

> **P1 — Orders list filtering, search & pagination**
> "Refactor the admin orders list (`src/app/admin/(protected)/orders/page.tsx`
> and `getOrders` in `src/lib/orders.ts`) to support URL-driven status tabs
> (all/pending/paid/preparing/ready/completed/cancelled), customer-email search,
> and pagination via Supabase `.range()`. Drive all state from
> `searchParams` so it stays server-rendered. Add a tab bar, a search input, and
> prev/next pager using the existing admin button styles."

> **P1 — Real Stripe refunds from the admin**
> "Add refund support. Create a `refundOrder` server action in
> `src/app/admin/(protected)/orders/actions.ts` that calls
> `stripe.refunds.create({ payment_intent })` for the order's
> `stripe_payment_intent_id`, then sets `payment_status='refunded'` and
> `order_status='refunded'`. Add a confirm-gated 'Refund order' button on the
> order detail page, shown only for paid orders. Also handle the
> `charge.refunded` event in the Stripe webhook to sync refunds initiated from
> the Stripe dashboard."

> **P1 — Customer order status page**
> "Add a customer-facing order status page. Create a migration adding
> `order_token uuid default gen_random_uuid()` to `orders`. After Stripe
> checkout, make `/success` look up the order by `session_id` and link to
> `/orders/[token]`. Build `/orders/[token]` as a read-only page showing items,
> totals (CAD), fulfillment, and current status, fetched via a narrow public
> route/RPC that returns only safe fields for a valid token (never the full
> row). Link the status page from the confirmation email too."

> **P1 — Handle cancelled checkout on the storefront**
> "On the storefront homepage, handle Stripe's `cancel_url`
> (`/?checkout=cancelled`). Add a small client component that reads the param,
> shows a dismissible banner ('Checkout cancelled — your cart is saved'),
> re-opens the cart drawer, and cleans the param from the URL. Keep the cart
> intact (it already only clears on success)."

> **P1 — Cart drawer accessibility (focus management)**
> "Improve the cart drawer (`src/components/store/CartDrawer.tsx`) for
> accessibility: trap focus inside the drawer while open, move focus to the
> close button (or first focusable element) on open, restore focus to the cart
> trigger on close, and mark the background `inert`/`aria-hidden`. Keep the
> existing Escape-to-close and body-scroll-lock behavior."

> **P1 — Mobile navigation menu**
> "Add a mobile navigation menu to the storefront header
> (`src/components/store/Header.tsx`). On small screens (where the section nav is
> currently hidden), add a hamburger button that opens a slide-down/sheet panel
> reusing the existing `NAV` array (Menu, How It Works, FAQ). Close it on link
> click and on Escape. Match the warm storefront styling."

> **P1 — Consistent admin loading/disabled states**
> "Make all admin mutation buttons show pending state consistently. Convert the
> Activate/Deactivate buttons (products list) and the discount On/Off toggle to
> use the existing `SubmitButton` (with pending text) or `useActionState` with an
> optimistic update, matching the Delete button's behavior. No button should look
> idle while its server action runs."

> **P1 — Debounce discount re-validation**
> "In `src/components/store/CartDrawer.tsx`, the effect that re-validates an
> applied discount fires on every subtotal change (every quantity tick),
> triggering a fetch each time. Add a ~400ms debounce and cancel any in-flight
> request, so rapid quantity changes result in a single validation call. Preserve
> the existing clear-on-empty-cart behavior."

> **P1 — Cache the storefront product list**
> "Reduce database load on the storefront. Replace `force-dynamic` on `/` with
> tag-based caching: wrap `getActiveProducts` so its read is cached and tagged
> `products`, and call `revalidateTag('products')` from every product mutation
> (create, update, delete, toggle active, image upload/delete/reorder/set
> primary) in the admin actions. Verify the menu updates immediately after admin
> changes."

> **P2 — Product detail pages with allergens**
> "Add `/products/[slug]` detail pages. Render full description, all images,
> price, prep time, and a new allergens/ingredients field (add `allergens text`
> to products + the admin form). Link product cards to the detail page while
> keeping inline add-to-cart. Add JSON-LD `Product` structured data and proper
> metadata for sharing/SEO."

> **P2 — Tighten orders RLS**
> "Harden Supabase RLS for orders. Add a SQL `is_admin()` helper (checking an
> `admins` table or a JWT claim) and rewrite the `orders` and `order_items`
> policies to use it instead of `to authenticated using(true)`, so only admins
> can read/update orders at the database layer. Keep server-side inserts (service
> role) working. Provide the migration and document how admin identities are
> seeded."

> **P2 — Atomic discount redemption cap**
> "Make discount redemption respect `max_redemptions` atomically. Update the
> `increment_discount_redemption` SQL function to only increment when
> `max_redemptions is null or redemption_count < max_redemptions`, returning the
> resulting count, and have the webhook treat 'no increment' as cap-reached
> (log + skip). Add a re-check so a code at its cap can't be redeemed by
> concurrent checkouts."

> **P2 — Toast notification system**
> "Introduce a lightweight, accessible toast system shared by storefront and
> admin (e.g., a small context/provider + `aria-live` region). Replace inline-only
> success/error messages and `window.confirm`-only feedback with consistent,
> non-blocking toasts for actions like add-to-cart, save, delete, and status
> updates. Keep destructive actions confirm-gated."

> **P2 — Pending-order reaper (cron)**
> "Add a scheduled cleanup for abandoned checkouts. Create
> `/api/cron/reap-pending` (guarded by a `CRON_SECRET`) that deletes `orders`
> with `payment_status='pending'` older than 6 hours and their `order_items`, and
> register it in `vercel.json` as a daily/hourly cron. This complements the
> existing Stripe `checkout.session.expired` handling."

> **P2 — SEO & social metadata**
> "Add SEO basics: set `metadataBase`, Open Graph + Twitter card tags, a favicon
> and apple-touch icon, JSON-LD `Bakery` + `Product` structured data, and
> `sitemap.ts`/`robots.ts`. Ensure the storefront has a descriptive title/
> description and an OG image."

---

## 6. What is already solid (leave as-is)

- Server-authoritative pricing and discount evaluation shared between display and
  charge.
- Idempotent webhook with the boolean-flag redemption guard.
- Service-role isolation for writes; anon never sees `discount_codes` or orders.
- Integer-cents money handling with a single `formatMoney`/locale source.
- Middleware **and** server-guard defense-in-depth on `/admin`.
- Cart reconciliation against live products (never trusts stale localStorage
  prices).

These are the right foundations — the roadmap above builds on them rather than
replacing them.
