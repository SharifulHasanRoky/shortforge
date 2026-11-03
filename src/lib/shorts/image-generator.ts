/**
 * Image generator using z-ai-web-dev-sdk.
 * Generates vertical 768x1344 cinematic images for Shorts.
 * Includes:
 *  - 30s hard timeout per request (so API hangs fail fast)
 *  - Retry with exponential backoff for 429/5xx
 *  - Gradient-slide fallback when all AI gens fail
 */
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

let zaiInstance: any = null;
async function getZAI() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

const IMAGE_DIR = '/home/z/my-project/storage/images';
// 768x1344 is portrait AND both dimensions are multiples of 32 (API requirement).
// We crop/scale to 720x1280 in the video composer for YouTube Shorts.
const PORTRAIT_SIZE = '768x1344';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Generate a single image with timeout + retry on rate limit.
 */
export async function generateImage(prompt: string, filename: string): Promise<string> {
  if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });

  const fullPath = path.join(IMAGE_DIR, filename);
  const enhanced = `${prompt}. Cinematic, dramatic lighting, moody atmosphere, high detail, dark aesthetic, no text, no watermark, vertical composition`;

  const zai = await getZAI();

  const maxAttempts = 3;
  let lastErr: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Race the API call against a timeout
      const result = await Promise.race([
        zai.images.generations.create({
          prompt: enhanced,
          size: PORTRAIT_SIZE,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Image gen timeout after 30s')), REQUEST_TIMEOUT_MS)
        ),
      ]);
      const imageBase64 = result.data[0].base64;
      const buffer = Buffer.from(imageBase64, 'base64');
      fs.writeFileSync(fullPath, buffer);
      return fullPath;
    } catch (err: any) {
      lastErr = err;
      const msg = err.message || '';
      const is429 = msg.includes('429');
      const is5xx = msg.includes('500') || msg.includes('502') || msg.includes('503');
      const isTimeout = msg.includes('timeout');
      if (is429 || is5xx || isTimeout) {
        const waitMs = 5000 * attempt; // 5s, 10s
        console.log(`Image gen attempt ${attempt} failed (${msg.slice(0, 80)}), retrying in ${waitMs}ms...`);
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/**
 * Generate multiple images sequentially. Returns paths to successfully
 * generated images. If ALL fail, falls back to gradient slides.
 *
 * If imageMode === 'gradient', skip AI entirely and use gradient slides
 * (useful for testing when the AI image API is rate-limited).
 */
export async function generateImagesForShort(
  prompts: string[],
  shortId: string,
  onProgress?: (done: number, total: number) => void,
  imageMode: 'ai' | 'gradient' = 'ai'
): Promise<string[]> {
  const limited = prompts.slice(0, 4);
  const paths: string[] = [];

  if (imageMode === 'ai') {
    for (let i = 0; i < limited.length; i++) {
      try {
        if (i > 0) await sleep(1500);
        const p = await generateImage(limited[i], `${shortId}_${i}.png`);
        paths.push(p);
        onProgress?.(i + 1, limited.length);
      } catch (err: any) {
        console.error(`Image ${i} generation failed:`, err.message);
      }
    }
  }

  // Fallback: if no AI images (either mode=gradient or all AI gens failed),
  // generate gradient slides with text.
  if (paths.length === 0) {
    console.warn('Using gradient slide fallback');
    // Use 0x prefix for ffmpeg color compatibility
    const gradientColors: [string, string][] = [
      ['0x1a0033', '0xff3366'],
      ['0x0d1b2a', '0xe63946'],
      ['0x1f0036', '0xff8c42'],
      ['0x0a1929', '0xffc857'],
    ];
    for (let i = 0; i < limited.length; i++) {
      const fallbackPath = path.join(IMAGE_DIR, `${shortId}_${i}.png`);
      const [c1, c2] = gradientColors[i % gradientColors.length];
      const label = limited[i].split(',')[0].slice(0, 40).toUpperCase();
      await generateGradientSlide(fallbackPath, c1, c2, label);
      paths.push(fallbackPath);
      onProgress?.(i + 1, limited.length);
    }
  }

  return paths;
}

/**
 * Generate a gradient slide with text using ffmpeg's `gradients` filter.
 * Used as fallback when AI image generation fails.
 *
 * color1 / color2 must be in 0xRRGGBB format (ffmpeg convention).
 */
async function generateGradientSlide(
  outputPath: string,
  color1: string,
  color2: string,
  text: string
): Promise<void> {
  const safeText = text.replace(/'/g, "\\'").replace(/:/g, '\\:');
  const fontFile = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

  // Use gradients filter to draw a diagonal gradient, then darken + drawtext on top.
  // gradients filter: c0=top-left, c1=top-right, c2=bottom-left, c3=bottom-right
  const vfArg = `drawbox=x=0:y=0:w=iw:h=ih:color=0x000000@0.35:t=fill,drawtext=fontfile='${fontFile}':text='${safeText}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2:line_spacing=10:borderw=5:bordercolor=black`;
  const fullCmd = `ffmpeg -y -f lavfi -i "gradients=c0=${color1}:c1=${color1}:c2=${color2}:c3=${color2}:s=768x1344:duration=1:rate=1" -vf "${vfArg}" -frames:v 1 "${outputPath}" -loglevel error`;
  await execAsync(fullCmd);
}

/**
 * Apply Ken Burns zoom effect to a single image and produce a short clip.
 * Returns path to the resulting MP4.
 */
export async function imageToZoomClip(
  imagePath: string,
  outputPath: string,
  durationSec: number,
  zoomType: 'in' | 'out' = 'in'
): Promise<string> {
  const fps = 30;
  const frames = Math.max(1, Math.round(durationSec * fps));
  const preScale = `scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280`;
  const zoomExpr = zoomType === 'in'
    ? `zoompan=z='min(zoom+0.0015,1.5)':d=${frames}:s=720x1280:fps=${fps}`
    : `zoompan=z='if(eq(on,0),1.5,max(zoom-0.0015,1.0))':d=${frames}:s=720x1280:fps=${fps}`;

  const cmd = `ffmpeg -y -i "${imagePath}" -vf "${preScale},${zoomExpr}" -t ${durationSec} -c:v libx264 -pix_fmt yuv420p -r ${fps} "${outputPath}" -loglevel error`;
  await execAsync(cmd);
  return outputPath;
}
