# Dockerfile for Render free tier - simplified

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

# Install ALL deps (need dev for build)
RUN npm ci --no-audit --no-fund

# Copy prisma and generate
COPY prisma ./prisma
RUN npx prisma generate

# Copy source
COPY . .

# Build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=400"
RUN npm run build

# Remove dev deps
RUN npm prune --omit=dev

# Create storage dirs
RUN mkdir -p /app/storage/videos /app/storage/audio /app/storage/images /app/storage/clips /app/storage/thumbnails

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV STORAGE_ROOT=/app/storage
EXPOSE 3000

# Start: run migrations, then start Next.js on Render's PORT
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh
CMD ["/app/start.sh"]
