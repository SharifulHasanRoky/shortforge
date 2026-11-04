# Dockerfile for ShortForge - Faceless YouTube Shorts Automation
# Uses ffmpeg + Node.js for full pipeline support
# Works with PostgreSQL (Supabase/Neon) and SQLite (local dev)

FROM node:20-slim

# Install ffmpeg, fonts (for captions), OpenSSL (for Prisma), and other deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-dejavu \
    fonts-dejavu-core \
    fonts-dejavu-extra \
    fonts-noto-color-emoji \
    fonts-freefont-ttf \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json bun.lock* ./

# Install dependencies using npm (more reliable on Docker builds than bun)
RUN npm install --omit=dev || npm install

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code
COPY . .

# Create storage directories (ephemeral on Render free, but works for runtime)
RUN mkdir -p /app/storage/videos /app/storage/audio /app/storage/images /app/storage/clips /app/storage/thumbnails

# Build the Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
ENV STORAGE_ROOT=/app/storage
RUN npm run build

# Expose port (Render/Railway provide PORT env var)
EXPOSE 3000

# Start command - run migrations then start server
# DATABASE_URL must be set as env var (Supabase PostgreSQL connection string)
# STORAGE_ROOT is set to /app/storage (ephemeral on free tier)
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run start"]
