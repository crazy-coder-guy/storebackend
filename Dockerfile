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

# PORT should match the PORT env var read by src/config/index.ts (defaults to 3000)
ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["node", "dist/server.js"]
