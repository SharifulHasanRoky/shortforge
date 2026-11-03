/**
 * Storage paths configuration.
 * Uses env vars if set, otherwise falls back to local dev paths.
 *
 * Production (Railway/Docker): /app/storage/*
 * Local dev: /home/z/my-project/storage/*
 */
import path from 'path';
import fs from 'fs';

const ROOT = process.env.STORAGE_ROOT || '/home/z/my-project/storage';

export const STORAGE = {
  ROOT,
  VIDEOS: path.join(ROOT, 'videos'),
  AUDIO: path.join(ROOT, 'audio'),
  IMAGES: path.join(ROOT, 'images'),
  CLIPS: path.join(ROOT, 'clips'),
  THUMBNAILS: path.join(ROOT, 'thumbnails'),
};

// Ensure all directories exist
export function ensureStorageDirs() {
  for (const dir of Object.values(STORAGE)) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

// Call on import to ensure dirs exist
ensureStorageDirs();
