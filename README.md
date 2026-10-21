# gtland

E-commerce website for selling trading cards, sealed product, and graded cards. Inventory is managed through a Django admin; the storefront is a Next.js app that reads the same Postgres database. Both live in this one repo as sibling folders.

## Architecture

A monorepo with two apps sharing one Postgres database:

- **`management-api/` (Django)** — owns the inventory schema and migrations. The `cards` app defines the `Product`/`CardDetails`/`SealedDetails`/`ProductImage` models and registers them in `admin.py`. You add/edit/remove inventory through the Django admin site (`/admin/`) — no custom tooling to build.
- **`storefront/` (Next.js)** — public storefront only. No write access to inventory; it just queries Postgres (or calls a read-only endpoint on `management-api`) to render the catalog, product pages, and search/filters.

This keeps "adding items" as easy as the Django admin, and lets the storefront be optimized for public browsing/SEO without needing its own admin UI. Each app keeps its own dependency manifest (`package.json` vs `requirements.txt`) and can still be built/deployed as separate containers even though they share a repo.

## Recommended stack

| Layer | Choice | Why |
|---|---|---|
| Inventory management | Django admin in `management-api/` | Auto-generated forms, image upload, inline related models |
| Storefront framework | [Next.js](https://nextjs.org/) (TypeScript, App Router) in `storefront/` | Good SEO/SSR for product pages, fast to build a catalog UI |
| Styling | Tailwind CSS | Fast to build a clean catalog UI without a design system |
| Database | PostgreSQL (shared by both apps) | Single source of truth for inventory |
| Storefront data access | Read-only Postgres user + lightweight query layer (`pg`), or call a DRF read endpoint on `management-api` | Avoids two tools (Django migrations + Prisma migrations) fighting over the same schema |
| Image storage | Django `ImageField` on a persistent volume, served at a URL the storefront can read | Reuses the admin's existing upload flow; same caveat about serverless hosts applies (see below) |
| Contact / orders | Simple form → email (no payment processing yet) | Matches v1 scope: browse catalog, inquire to buy |

### A note on image storage + deployment

Local filesystem storage only works if the server has a **persistent disk**. Serverless hosts (Vercel, Netlify) wipe the filesystem between deploys/requests, so uploaded images would disappear. Options:

1. **Deploy to a VPS** (DigitalOcean, Hetzner, Linode) running Docker Compose with the app + Postgres + a mounted volume for images. Point your existing domain's DNS (A/AAAA record) at the VPS IP. Your Google Workspace is just mail (MX records) — it doesn't conflict with hosting the website on a different A record, so you can keep both.
2. **Start local-filesystem, migrate later** to object storage (S3, Cloudflare R2, Backblaze B2) if you move to a serverless host. Keep the image-handling code behind a small abstraction (`lib/storage.ts`) so swapping the backend later is a one-file change.

## Data model (first pass, owned by `management-api/`)

Defined as Django models in `management-api/cards`; `storefront/` only reads these tables.

- **Product** — shared fields: `id`, `slug`, `title`, `description`, `category` (`single_card` | `sealed` | `graded` | `deck`), `price`, `quantity`, `status` (`available` | `sold` | `hidden`), `created_at`, `updated_at`
- **CardDetails** (1:1 with Product, when category = single_card/graded) — `set`, `player_or_character`, `year`, `condition`, `grading_company` (nullable, e.g. PSA/BGS), `grade` (nullable)
- **SealedDetails** (1:1 with Product, when category = sealed) — `set`, `year`, `pack_count`/`box_type`, `sealed_condition`
- **ProductImage** (1:many with Product) — `id`, `product`, `image`, `sort_order`
- **Inquiry** (contact/order requests, likely owned by `storefront/` instead since it's storefront-originated) — `id`, `product_id` (nullable), `name`, `email`, `message`, `created_at`

This can start as a single `Product` model with nullable category-specific fields if you'd rather avoid joins early on — normalize later if it gets unwieldy.

## Adding inventory (the easy way)

This is just Django admin — run `management-api/`, log into `/admin/`, click **Add Product**, fill in the fields, upload images inline, save. Example `admin.py` to get the list/detail experience described:

```python
# management-api/cards/admin.py
from django.contrib import admin
from .models import Product, CardDetails, SealedDetails, ProductImage

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1  # one empty upload slot by default

class CardDetailsInline(admin.StackedInline):
    model = CardDetails
    extra = 0

class SealedDetailsInline(admin.StackedInline):
    model = SealedDetails
    extra = 0

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "price", "quantity", "status", "updated_at")
    list_filter = ("category", "status")
    list_editable = ("price", "quantity", "status")  # quick bulk edits in the list view
    search_fields = ("title", "carddetails__player_or_character", "carddetails__set")
    inlines = [CardDetailsInline, SealedDetailsInline, ProductImageInline]
```

That's the whole "admin UI" — no custom frontend to build or maintain. A few optional add-ons worth considering later:

- A small admin method to render an image thumbnail in `list_display`
- `prepopulated_fields = {"slug": ("title",)}` so slugs auto-generate from the title

## Local development setup

### Postgres (shared by both apps)
```sh
docker compose up -d db
```
Starts Postgres 16 on `localhost:5432` with a persistent named volume (`docker-compose.yml` at the repo root). Credentials are in `management-api/.env.example` (`gtland_admin` / `changeme`) — fine for local dev, never reuse in production.

### `management-api/` (Django)
```sh
cd management-api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DB credentials/secret key
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
Visit `http://localhost:8000/admin/` and add a few test products.

### `storefront/` (Next.js)

#### Prerequisites
- Node.js (LTS)
- Access to the same Postgres instance `management-api` uses (or a copy of it for local dev)

#### Steps
1. `cd storefront && npm install`
2. Copy `.env.local.example` to `.env.local` and set `DATABASE_URL` to a read-only role on the shared Postgres instance
3. `npm run dev` and visit `http://localhost:3000`

## Roadmap / brainstormed steps

### Phase 1 — Catalog MVP
- [x] Scaffold `storefront/` (Next.js + Tailwind)
- [x] Scaffold `management-api/` (Django) with `cards` app: Product/CardDetails/SealedDetails/ProductImage models + admin registration
- [x] Local Postgres via `docker-compose.yml`; migrations applied and `/admin/` verified working
- [x] Read-only `gtland_readonly` DB role created; storefront's read path (`src/lib/db.ts`, `src/lib/products.ts`) queries real data
- [x] Build product listing page (grid of cards with image, title, price, condition/grade) — verified end-to-end with a real product
- [ ] Add real inventory via `/admin/`
- [x] Build product detail page (full images, description, condition/grade, "Inquire to buy" `mailto:` CTA) — verified end-to-end with a real product
- [x] Build category/filter navigation (category, set, min/max price via URL search params, no client JS) — verified end-to-end
- [x] Contact/inquiry form at `/contact` (Server Action + `nodemailer`; logs to console in dev if SMTP isn't configured) — verified end-to-end
- [x] Basic search (keyword search across title, description, player/character, and set) — verified end-to-end

### Phase 2 — Operations & polish
- [x] Mark-as-sold workflow — already covered: `status` is in `list_editable` on `ProductAdmin`, so flipping a product to `sold` after a sale is a one-click edit in the admin list view (no inquiry record exists to tie it to, since inquiries are emailed, not stored)
- [ ] Mobile responsive pass + basic SEO (meta tags, sitemap, product structured data)
- [ ] Analytics (e.g. Plausible/GA) to see what people view
- [ ] Automated backups of the Postgres database

### Phase 3 — Growth
- [ ] Real checkout + payments (Square) if contact-for-sales becomes too much overhead
- [ ] Migrate images to object storage (S3/R2) if moving `management-api` or `gtland` off a VPS
- [ ] Wishlist / "notify me when back in stock"

## Deployment (when ready)

1. Provision a small VPS, install Docker + Docker Compose
2. `docker-compose.yml` at the repo root with services: `management-api` (Django + admin, building from `management-api/`), `storefront` (Next.js, building from `storefront/`), `db` (Postgres, with a named volume shared by both), optionally `nginx` as reverse proxy + TLS (Let's Encrypt via Certbot)
3. Point your domain's A record to the VPS IP; keep MX records pointing at Google Workspace for email
4. Set production `DATABASE_URL` and other secrets as environment variables for both services (never commit `.env`)
5. Run Django migrations (`python manage.py migrate`) on deploy for `management-api`; `storefront` needs no migrations since it doesn't own the schema
