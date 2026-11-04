# Minimal Dockerfile for Render free tier
# Single-stage to avoid copying issues

FROM node:20-slim

# Install ffmpeg + minimal fonts + openssl for Prisma
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-dejavu-core \
    fonts-freefont-ttf \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL deps (including dev - we need them for build)
RUN npm ci --no-audit --no-fund

# Copy prisma and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source
COPY . .

# Build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=400"
RUN npm run build

# Remove dev dependencies to slim runtime image
RUN npm prune --omit=dev

# Create storage dirs
RUN mkdir -p /app/storage/videos /app/storage/audio /app/storage/images /app/storage/clips /app/storage/thumbnails

ENV NODE_ENV=production
ENV PORT=3000
ENV STORAGE_ROOT=/app/storage
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000

# Run migrations + start
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run start"]
