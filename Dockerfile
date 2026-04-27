# =============================================================================
# AstroLumina BookingAPI - Dockerfile
# Express API pentru programări Cal.com
# =============================================================================

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Dependencies
# Instalează DOAR dependențele de producție (fără devDependencies).
# Stage separat pentru a putea fi copiat selectiv în imaginea finală,
# fără să includă codul sursă sau toolurile de build.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
# node:22-alpine = Node.js 22 pe Alpine Linux (~5MB vs ~900MB pentru ubuntu).
# AS deps = nume simbolic folosit mai jos la COPY --from=deps

WORKDIR /app
# Toate comenzile următoare rulează relativ la /app în interiorul containerului.

# Copiem DOAR manifestele, nu tot codul sursă.
# Avantaj: Docker cache - dacă package.json nu s-a schimbat,
# acest layer e cache-uit și npm ci nu mai rulează la rebuild.
COPY package.json package-lock.json ./

# npm ci = instalare strictă bazată pe package-lock.json (reproducibilă).
# --only=production = exclude devDependencies (TypeScript, ts-node, etc.)
# Rezultat: node_modules/ cu doar ce e necesar în producție.
RUN npm ci --only=production

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Builder
# Instalează TOATE dependențele (inclusiv dev) și compilează TypeScript.
# Acest stage nu intră în imaginea finală - doar outputul lui (dist/).
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
# npm ci fără --only=production = include și devDependencies (ex: typescript, @types/*)
RUN npm ci

# Copiem tot codul sursă (src/, config/, routes/, services/, etc.)
COPY . .

# Rulează scriptul "build" din package.json (de obicei: tsc).
# TypeScript (.ts) → JavaScript (.js) compilat în dist/
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Production Runner
# Imaginea finală care va rula pe Render.
# Conține DOAR ce e necesar la runtime - fără sursă .ts, fără devDependencies.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
# Container curat - nu moștenește nimic din stage-urile anterioare.

WORKDIR /app

# Bună practică de securitate: aplicația nu trebuie să ruleze ca root.
# addgroup: creează grupul "nodejs" cu GID 1001
# adduser: creează userul "nodejs" cu UID 1001, -S = system user (fără parolă/home)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Luăm node_modules din Stage 1 (production only, fără devDependencies).
# TypeScript compiler și alte tooluri de dev NU ajung în imaginea finală.
COPY --from=deps /app/node_modules ./node_modules

# Luăm codul compilat (JavaScript) din Stage 2.
# Fișierele .ts originale NU ajung în imaginea finală.
COPY --from=builder /app/dist ./dist
# package.json e necesar pentru Node.js (câmpul "main", "type": "module", etc.)
COPY --from=builder /app/package.json ./
# Fișiere de configurare runtime (ex: setări Cal.com API, env-specific config)
COPY --from=builder /app/config ./config
# Middleware Express (auth, rate limiting, error handling, etc.)
COPY --from=builder /app/middleware ./middleware
# Route handlers pentru endpointurile API (ex: /bookings, /webhooks Cal.com)
COPY --from=builder /app/routes ./routes
# Servicii business logic (ex: integrare Cal.com, trimitere email-uri Resend)
COPY --from=builder /app/services ./services
# Tipuri TypeScript compilate sau fișiere .d.ts necesare la runtime
COPY --from=builder /app/types ./types
# Fișier de inițializare Sentry (trebuie importat primul în server.js)
COPY --from=builder /app/instrument.js ./

# NODE_ENV=production: activează optimizări în Express și alte librării
# (disable stack traces în răspunsuri, enable caching, etc.)
ENV NODE_ENV=production
# Portul pe care ascultă acest API (unic per serviciu: Astrology=3031, Payment=3032)
ENV PORT=3033

# Dăm ownership complet userului nodejs asupra /app.
# Necesar după COPY --from=... care copiază fișierele cu owner root.
RUN chown -R nodejs:nodejs /app

# Toate comenzile de la acest punct (inclusiv CMD) rulează ca "nodejs", nu root.
# Dacă aplicația e compromisă, atacatorul nu are privilegii de root pe host.
USER nodejs

# Documentează că containerul ascultă pe 3033.
# Nu deschide efectiv portul - asta o face Render sau docker run -p 3033:3033
EXPOSE 3033

# Comanda de start a containerului.
# Formă array (exec form) = procesul Node.js primește semnalele OS direct
# (SIGTERM, SIGINT) pentru graceful shutdown, fără shell intermediar.
CMD ["node", "dist/server.js"]