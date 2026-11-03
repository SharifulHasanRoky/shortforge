# Dockerfile for ShortForge - Faceless YouTube Shorts Automation
# Uses ffmpeg + Node.js + Bun for full pipeline support

FROM node:20-slim

# Install ffmpeg, fonts (for captions), and other deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-dejavu \
    fonts-dejavu-core \
    fonts-dejavu-extra \
    fonts-noto-color-emoji \
    fonts-freefont-ttf \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN bunx prisma generate

# Copy source code
COPY . .

# Create storage directories
RUN mkdir -p /app/storage/videos /app/storage/audio /app/storage/images /app/storage/clips /app/storage/thumbnails /app/db

# Build the Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# Expose port (Railway provides PORT env var)
ENV PORT=3000
EXPOSE $PORT

# Start command - run migrations then start server
CMD ["sh", "-c", "bunx prisma db push --accept-data-loss && bun run start"]
