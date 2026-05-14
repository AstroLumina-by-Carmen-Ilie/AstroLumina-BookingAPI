# =============================================================================
# AstroLumina BookingAPI - Dockerfile
# =============================================================================

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

LABEL org.opencontainers.image.title="AstroLumina BookingAPI" \
      org.opencontainers.image.description="Booking API Express Server" \
      org.opencontainers.image.vendor="AstroLumina" \
      org.opencontainers.image.licenses="MIT"

RUN chown -R nodejs:nodejs /app
USER nodejs

CMD ["node", "dist/server.js"]