# Multi-stage build for Backend & Telegram Bot
FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend manifests
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

# Copy backend source
COPY backend/ ./backend/
RUN cd backend && npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY backend/package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/backend/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
