# Debug Dockerfile for Render - logs every step

FROM node:20-slim

# Install ffmpeg + minimal fonts + openssl for Prisma
RUN echo "=== STEP 1: Installing system deps ===" && \
    apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-dejavu-core \
    fonts-freefont-ttf \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* && \
    echo "=== STEP 1 DONE ==="

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL deps (need dev deps for build)
RUN echo "=== STEP 2: npm ci ===" && \
    npm ci --no-audit --no-fund 2>&1 | tail -5 && \
    echo "=== STEP 2 DONE ==="

# Copy prisma and generate client
COPY prisma ./prisma
RUN echo "=== STEP 3: prisma generate ===" && \
    npx prisma generate 2>&1 | tail -5 && \
    echo "=== STEP 3 DONE ==="

# Copy source
COPY . .

# Build with debug info
RUN echo "=== STEP 4: Next.js build ===" && \
    NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS="--max-old-space-size=400" npm run build 2>&1 | tail -20 && \
    echo "=== STEP 4 DONE ==="

# Remove dev dependencies
RUN echo "=== STEP 5: npm prune ===" && \
    npm prune --omit=dev 2>&1 | tail -3 && \
    echo "=== STEP 5 DONE ==="

# Create storage dirs
RUN mkdir -p /app/storage/videos /app/storage/audio /app/storage/images /app/storage/clips /app/storage/thumbnails

ENV NODE_ENV=production
ENV PORT=3000
ENV STORAGE_ROOT=/app/storage
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run start"]
