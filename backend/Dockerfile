# Multi-stage build for Backend & Telegram Bot
FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (including build tools)
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled files and assets from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
