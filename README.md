# T-Shirt Store Backend — Phase 1: Product Catalog, Variants & Inventory

Express + TypeScript + Prisma (PostgreSQL/Neon) backend implementing Phase 1 of the
T-shirt e-commerce platform: **Product Catalog, Product Variants, and Inventory
Management**. Orders, customers, payments, shipping, coupons, reviews, and
authentication are explicitly out of scope for this phase.

## Tech stack

- Express + TypeScript (CommonJS, strict mode)
- Prisma ORM (PostgreSQL / Neon)
- Zod for request validation
- Jest + ts-jest + Supertest for tests
- Scalar API Reference for interactive docs at `/docs`

## Setup

```bash
npm install
cp .env.example .env   # fill in the values below
npx prisma generate
npx prisma migrate dev   # applies migrations (see "Neon & migrations" below)
npm run db:seed          # optional: seeds categories/sizes/colors/products/variants
npm run dev               # starts the dev server with nodemon + ts-node
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_SSL`, `DB_CHANNEL_BINDING` | Individual Postgres connection parts (kept for tooling that wants discrete fields) |
| `DATABASE_URL` | **Pooled** Neon connection string (via PgBouncer) — used by the app at runtime |
| `DIRECT_URL` | **Direct** (non-pooled) Neon connection string — used by Prisma Migrate |
| `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | S3-compatible object storage credentials, reserved for a future image-upload service (not used in Phase 1 — see "Product images" below) |
| `PORT` | HTTP port the server listens on |
| `NODE_ENV` | `development` / `production` |

### Why two database URLs? (Neon pooled vs. direct)

Neon serverless Postgres fronts your database with **PgBouncer** for connection
pooling (`DATABASE_URL`). PgBouncer's transaction-pooling mode does not support
Postgres **prepared statements**, which Prisma's query engine relies on. Prisma
Migrate (and the shadow database it creates to compute diffs) needs prepared
statements, so it must talk to Postgres directly, bypassing the pooler — that's
what `DIRECT_URL` is for (configured via `directUrl` in `prisma/schema.prisma`).
At runtime, the app itself uses the pooled `DATABASE_URL` since ordinary CRUD
queries work fine through PgBouncer and pooling keeps connection counts low
under serverless/bursty traffic.

## Database: migrations & seeding

```bash
npx prisma migrate dev --name <description>   # create + apply a migration (uses DIRECT_URL)
npx prisma generate                             # regenerate the Prisma Client
npm run db:seed                                 # run prisma/seed.ts
```

In this environment `npx prisma migrate dev --name init` worked directly against
Neon (Neon allowed the transient shadow database Prisma Migrate creates), so no
fallback to `prisma db push` was necessary. If your Neon project's role lacks
permission to create databases, `prisma migrate dev` will fail while creating
the shadow database — in that case fall back to `npx prisma db push` to sync the
schema without a migration history, and note that migrations should be
generated once from an environment that does have shadow-DB permissions (or via
Neon's own branching-based shadow database support).

## Running tests

```bash
npm test    # jest --runInBand
```

Tests run against the **real `DATABASE_URL`** — there is no separate test
database in this environment. Every test file creates its own uniquely-suffixed
rows (categories/products/colors/sizes/variants) and deletes them in
`afterAll`, so the shared dev database is left exactly as it was before the run
(verified: category/product/variant counts are unchanged after `npm test`).
`--runInBand` is used so tests execute sequentially and don't race each other
with concurrent writes against the shared database.

## Running the server

```bash
npm run dev     # nodemon + ts-node, auto-reload
npm run build   # tsc -> dist/
npm start       # node dist/server.js
```

- Health check: `GET /api/health`
- API docs (Scalar UI): `GET /docs`
- Raw OpenAPI spec: `GET /openapi.json`

## API base path

All Phase 1 resource endpoints are mounted under **`/api/v1`**.

## Endpoints

### Categories — `/api/v1/categories`
- `GET /` — list (search by name, filter by status, paginated)
- `GET /:id`
- `POST /` — auto-generates a unique slug from `name` if `slug` is omitted
- `PATCH /:id`
- `DELETE /:id` — **soft delete** (sets `status` to `INACTIVE`)

### Products — `/api/v1/products`
- `GET /` — list with pagination, `search` (name, case-insensitive), `category_id`
  filter, `status` filter, `sortBy` (`created_at` | `base_price` | `name`),
  `sortOrder` (`asc` | `desc`)
- `GET /:id` — includes `images[]` and `variants[]` (each with `color`/`size`)
- `POST /`
- `PATCH /:id`
- `DELETE /:id` — soft delete

### Product Images — `/api/v1/products/:productId/images`
- `GET /`, `POST /`, `PATCH /:imageId`, `DELETE /:imageId` (hard delete — no
  status field on this model)
- **Phase 1 stores only an `imageUrl` string** — there is no upload pipeline
  yet. `config.s3` (backed by `AWS_ENDPOINT_URL_S3` / `AWS_ACCESS_KEY_ID` /
  `AWS_SECRET_ACCESS_KEY` / `AWS_REGION`) already exists in
  `src/config/index.ts` and is ready to be wired into a future upload service
  (e.g. Cloudinary or direct S3/Neon object storage) that would generate the
  URL this endpoint accepts.

### Product Variants — `/api/v1/products/:productId/variants`
- `GET /`, `GET /:variantId`
- `POST /` — SKU is auto-generated (e.g. `KAI-OV-BLK-S`) from the product slug
  + color code + size code when omitted; an explicit `sku` overrides this.
  Duplicate `(productId, colorId, sizeId)` combos are rejected with
  `409 DUPLICATE_VARIANT`; duplicate SKUs are rejected with `409 DUPLICATE_SKU`.
- `PATCH /:variantId`
- `DELETE /:variantId` — soft delete (kept because `InventoryTransaction` rows
  reference the variant)

### Sizes — `/api/v1/sizes`
- `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id` (soft delete)

### Colors — `/api/v1/colors`
- `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id` (soft delete)

### Inventory — `/api/v1/inventory`
- `GET /` — variants joined with product/size/color; filters: `sku`,
  `product_id`, `product_name`, `size_id`, `color_id`, pagination
- `GET /low-stock?threshold=10` — `ACTIVE` variants at or under the threshold
  (default 10)
- `GET /out-of-stock` — `ACTIVE` variants with `stockQuantity = 0`
- `PATCH /:variantId` — body `{ type: 'RESTOCK' | 'MANUAL_INCREASE' |
  'MANUAL_DECREASE' | 'ADJUSTMENT', quantity, reason? }`. `RESTOCK` /
  `MANUAL_INCREASE` add to stock, `MANUAL_DECREASE` subtracts (rejects with
  `422 INSUFFICIENT_STOCK` if it would go negative), `ADJUSTMENT` sets stock to
  the absolute value of `quantity`. The stock update and the
  `InventoryTransaction` insert happen inside a single `prisma.$transaction`.
- `GET /:variantId/history` — paginated transaction history, newest first

## Response contract

Success:
```json
{ "success": true, "data": { }, "message": "..." }
```
List endpoints:
```json
{ "success": true, "data": { "items": [ ], "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 1 } } }
```
Error:
```json
{ "success": false, "message": "...", "error": { "code": "SOME_CODE" } }
```

## Project layout

```
prisma/
  schema.prisma     # data model
  seed.ts           # seed script (categories, sizes, colors, products, variants, images)
src/
  config/           # app config + OpenAPI spec
  controllers/       # thin HTTP handlers
  services/          # business logic + Prisma calls
  routes/            # Express routers
  validation/         # zod schemas
  middleware/         # error handler, validate, notFoundHandler
  utils/              # AppError, response helper, pagination helper, slug/sku helpers
  database/           # Prisma client singleton + connectDatabase()
tests/                # Jest + Supertest integration tests (run against the real DB)
```
