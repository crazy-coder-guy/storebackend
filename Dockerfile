# ---- Build stage ----
FROM node:20-alpine AS build

# Alpine doesn't ship the `openssl` CLI Prisma shells out to for version
# detection; without it, generate silently guesses wrong and produces an
# engine binary incompatible with this same image's runtime OpenSSL.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Run stage ----
FROM node:20-alpine AS run

RUN apk add --no-cache openssl

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY scripts/recalculate-prices.js ./scripts/recalculate-prices.js

# PORT should match the PORT env var read by src/config/index.ts (defaults to 3000)
ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

# `prisma generate` (build stage) only regenerates the client to match
# schema.prisma — it never touches the database. Without applying pending
# migrations here too, a deploy can ship a client that queries columns the
# production database doesn't have yet (exactly what happened: cost_price /
# shipping_fee existed in the schema and compiled client, but no migration
# had ever run against Render's database). `migrate deploy` is safe to run
# on every boot — it only applies migrations not yet recorded as applied and
# no-ops otherwise.
#
# recalculate-prices.js then keeps every product/variant's selling price in
# sync with its cost price + the current pricing settings, with zero admin
# action required — it's idempotent (a no-op once prices already match) and
# never fails the boot (errors are caught and logged inside the script).
CMD ["sh", "-c", "npx prisma migrate deploy && node scripts/recalculate-prices.js && node dist/server.js"]
