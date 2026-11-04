# Optimized Dockerfile for Render free tier (512MB RAM)
# Multi-stage build to minimize final image size and build memory usage

# Stage 1: Build
FROM node:20-slim AS builder

# Install only essential build deps (ffmpeg installed in runtime stage)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install only production deps first (smaller, faster)
RUN npm install --omit=dev --no-audit --no-fund

# Copy prisma and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy all source and build
COPY . .

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Build with low memory settings
ENV NODE_OPTIONS="--max-old-space-size=400"
RUN npm run build

# Stage 2: Runtime (much smaller)
FROM node:20-slim

# Install ffmpeg + fonts for video composition at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-dejavu-core \
    fonts-freefont-ttf \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built app from builder stage
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/postcss.config.mjs ./
COPY --from=builder /app/tailwind.config.ts ./
COPY --from=builder /app/components.json ./
COPY --from=builder /app/src ./src

# Create storage dirs
RUN mkdir -p /app/storage/videos /app/storage/audio /app/storage/images /app/storage/clips /app/storage/thumbnails

ENV NODE_ENV=production
ENV PORT=3000
ENV STORAGE_ROOT=/app/storage
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000

# Run migrations + start
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run start"]
