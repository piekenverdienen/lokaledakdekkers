# Build-context is de root van de repo (Coolify: Base Directory "/", Dockerfile "/web/Dockerfile")
FROM node:22-alpine AS deps
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY web/ .
RUN npm run build
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY web/scripts ./scripts
COPY web/data ./data
COPY web/content ./content
COPY db ./db
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate.mjs && (node scripts/import-kvk.mjs &) && node server.js"]
