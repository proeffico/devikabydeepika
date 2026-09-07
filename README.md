# Devikka by Deepika — store, dress combo packs and Mandir Seva

Node.js 20+ · Express · EJS (server-rendered) · MySQL 8 / MariaDB 10.11 · Razorpay.

The first place in India that puts three things together: deity garments cut to the idol's own measurements, a recurring dress pack for every deity in the house, and a trained sevadar who comes home and dresses the mandir — all on one record of your mandir.

## What is in the box

| Area | Where |
|---|---|
| Storefront, multi-page, English + Hindi (`/` and `/hi/...`) | `src/routes/store.js`, `src/views/pages/` |
| Shop by category → sub-category, by deity, by festival | `/shop`, `/shop/:category/:sub`, `/deity/:slug`, `/festival/:slug` |
| Dress combo pack builder with live pricing and the aarti thali | `/dress-pack` |
| Mandir Seva visit plans, priced by mandir footprint | `/mandir-seva` |
| Cart → checkout → Razorpay → order | `src/routes/commerce.js`, `src/services/orders.js` |
| Subscriptions (visit plan, dress pack) via Razorpay Subscriptions, cycles, fabric-choice links | `src/services/subscriptions.js`, `/choose/:token` |
| Customer accounts by phone OTP, mandir profile with measured idols | `src/routes/account.js` |
| Sevadar signup, visit booking with sector capacity, waitlist by pin code | `src/routes/account.js` |
| Admin: orders, products, subscriptions, cycles, bookings, sevadars, pricing, festivals, audit | `/admin` |
| SEO: canonical, hreflang, Open Graph, JSON-LD (Organization, Product, Service, FAQPage, BreadcrumbList, ItemList), sitemap.xml, robots.txt | `src/lib/seo.js`, `/sitemap.xml` |

## Run it locally

```bash
cp .env.example .env            # fill DB_*, SESSION_SECRET, Razorpay test keys
npm install
npm run migrate                 # creates every table
npm run seed                    # taxonomy, deities, festivals, size bands, plans, starter products, FAQ
npm run admin:create            # owner login from ADMIN_EMAIL / ADMIN_PASSWORD in .env
npm start                       # http://localhost:3000  ·  admin at /admin
```

## Database — migration commands

Knex manages the schema. All commands read `.env`.

```bash
# create the database and a least-privilege user (run as MySQL root)
mysql -u root -p -e "CREATE DATABASE devikka CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER 'devikka'@'%' IDENTIFIED BY 'a-strong-password';
  GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES ON devikka.* TO 'devikka'@'%';
  FLUSH PRIVILEGES;"

# apply every pending migration (creates 30 tables)
npm run migrate                 # = npx knex migrate:latest

# see what has been applied
npm run migrate:status

# undo the last batch
npm run migrate:rollback

# load the seed data (idempotent — it clears catalog/content tables first, never customer data)
npm run seed

# both in one go on a fresh database
npm run db:setup

# make a new migration when you change the schema
npx knex migrate:make add_something
```

With Docker Compose the same commands run inside the container:

```bash
docker compose up -d
docker compose run --rm app npm run db:setup
docker compose run --rm app npm run admin:create
```

### Schema in one paragraph

Catalog is three-facet: `categories` → `subcategories`, `deities`, `size_bands`, with `products` carrying either a per-piece `base_price` or size-band `product_variants`, and `product_deities` / `product_festivals` as the cross-cutting filters. Customers (`customers`, phone-OTP) own a `households` row — footprint, dressing preference, photo consent — with measured `idols` under it. Commerce: `carts` → `orders`/`order_items` → `payments`. Recurring: `visit_plans`, `combo_discounts`, `subscriptions` + `subscription_items` → `cycles` → `cycle_choices`. Field ops: `sectors`, `sevadars`, `visit_bookings`, `waitlist`. Content: `testimonials`, `faqs`, `settings`. Control: `admins`, `audit_log`, `webhook_events`, `sessions`.

## Payments (Razorpay)

- One-time orders: server creates a Razorpay Order, browser opens Checkout, server verifies `HMAC-SHA256(order_id|payment_id)` before marking paid. Stock decrements on payment, not on cart.
- Subscriptions: server creates a Razorpay Plan (cached per amount/rhythm) and Subscription; browser authorises the mandate (UPI Autopay / card); server verifies `HMAC(payment_id|subscription_id)`.
- Webhook `/webhooks/razorpay`: raw-body HMAC with the webhook secret, idempotent on event id, handles `payment.captured`, `payment.failed`, `subscription.*`. Point the Razorpay dashboard webhook at `https://your-domain/webhooks/razorpay`.

## Security

- **Helmet** with a strict CSP (self + Google Fonts + Razorpay checkout), `frame-ancestors 'none'`, HSTS in production, no `X-Powered-By`.
- **CSRF**: session-bound synchronizer token on every state-changing request (`_csrf` field or `x-csrf-token` header). Webhooks are exempt and HMAC-verified instead.
- **Rate limits**: global 300/min/IP; OTP send 5 per 15 min per IP+phone; OTP verify and admin login 20 per 15 min; public forms 15/hour; checkout 30 per 10 min; admin area 120/min. nginx adds a second layer.
- **Anti-spam** on public forms: hidden honeypot field + minimum 3-second fill time.
- **OTP**: 6-digit, bcrypt-hashed at rest, 10-minute expiry, 5 attempts then locked, previous codes invalidated on reissue.
- **Admin**: bcrypt(12) passwords, 5 failed logins → 15-minute lockout, session regenerated on login, role gates (`owner` / `ops` / `content`), every write audited with IP.
- **Input validation** with zod on every POST; parameterised queries via Knex throughout; body limit 64 KB; HPP.
- **Sessions**: httpOnly, SameSite=Lax, Secure in production, stored in MySQL, rotated on login.
- **Production refuses to start** without a 32+ char `SESSION_SECRET`, Razorpay keys and `COOKIE_SECURE=true`.
- Customer shrine photos are never used without `households.photo_consent`. Testimonials carry a `consent_on_file` flag.

## Before going live

1. Real Razorpay keys and webhook secret in `.env`; create the webhook in the dashboard.
2. `SMS_PROVIDER=msg91` with an approved DLT template that carries the OTP as `VAR1`. Until then `console` logs codes to the server log.
3. Confirm per-band poshak prices with the master tailor, then untick **price is an estimate** on each product in `/admin/products`. Set the combo ladder in `/admin/pricing`. Set festival pack prices and dates in `/admin/festivals`.
4. Add Mansi Agarwal's portrait (`public/img/portrait.jpg`) and wire it into `pages/story.ejs`.
5. Written permission for the eight shrine photographs in `public/img/work/` and the six testimonials.
6. `og-image.jpg` in `public/`, analytics/Meta Pixel in `partials/head.ejs`.
7. Domain: the canonical URLs use `BASE_URL`. The logo says **Devikka** (two Ks) — register the matching domain.
8. Trademark clearance on "Devikka".

## Tests

```bash
npm start &
node test/smoke.js       # 65 checks: pages, SEO, CSP, CSRF, honeypot, booking capacity, waitlist,
                         # dress-pack pricing + thali, cart, checkout signature verify, OTP login,
                         # account profile + idol auto-banding, admin lockout + every admin page, mobile overflow
```

Razorpay is stubbed in the browser for the checkout test; with placeholder keys the order-creation step fails gracefully and the test records that it reached the payment step.

## Layout

```
src/
  app.js            middleware order (webhooks → static → parsers → session → locale → csrf → routes)
  server.js         boot
  config.js         env + production guard
  db.js             knex
  i18n/strings.js   UI strings EN/HI (catalog text lives in the DB as *_en / *_hi)
  middleware/       security, session, locale, auth, errors
  lib/              otp, razorpay, seo, validate, pricing, audit
  services/         catalog, cart, orders, subscriptions
  routes/           store, commerce, account, admin, webhooks
  views/            partials, pages, admin (EJS)
migrations/         20260907000000_init.js
seeds/              001_catalog.js
public/             css, js, img
nginx/              TLS + rate-limit reverse proxy
```
