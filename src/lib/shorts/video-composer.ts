/**
 * Video composer using ffmpeg.
 * Combines: AI images (with Ken Burns zoom) + voiceover audio + ASS captions.
 * Outputs vertical 720x1280 MP4 ready for YouTube Shorts.
 */
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { imageToZoomClip } from './image-generator';
import { generateAssFile, WordTiming } from './ass-generator';

const execAsync = promisify(exec);

const VIDEO_DIR = '/home/z/my-project/storage/videos';
const CLIPS_DIR = '/home/z/my-project/storage/clips';

export interface ComposeOptions {
  shortId: string;
  imagePaths: string[];
  audioPath: string;
  durationSec: number;
  wordTimings: WordTiming[];
  hookText: string; // big text shown at start
}

/**
 * Compose final vertical video.
 * Steps:
 *  1. Distribute images evenly across audio duration
 *  2. Generate per-image zoom clip
 *  3. Concat clips
 *  4. Add audio + burn ASS captions + add hook overlay at start
 *  5. Final mux
 */
export async function composeVideo(opts: ComposeOptions): Promise<string> {
  if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
  if (!fs.existsSync(CLIPS_DIR)) fs.mkdirSync(CLIPS_DIR, { recursive: true });

  const { shortId, imagePaths, audioPath, durationSec, wordTimings, hookText } = opts;

  // 1. Distribute images evenly
  const perImage = durationSec / imagePaths.length;
  const clipPaths: string[] = [];

  for (let i = 0; i < imagePaths.length; i++) {
    const clipPath = path.join(CLIPS_DIR, `${shortId}_clip_${i}.mp4`);
    const zoomType: 'in' | 'out' = i % 2 === 0 ? 'in' : 'out';
    await imageToZoomClip(imagePaths[i], clipPath, perImage, zoomType);
    clipPaths.push(clipPath);
  }

  // 2. Concat all clips
  const concatListPath = path.join(CLIPS_DIR, `${shortId}_concat.txt`);
  fs.writeFileSync(
    concatListPath,
    clipPaths.map(p => `file '${p}'`).join('\n')
  );
  const concatVideoPath = path.join(CLIPS_DIR, `${shortId}_concat.mp4`);
  await execAsync(
    `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${concatVideoPath}" -loglevel error`
  );

  // 3. Generate ASS file
  const assPath = path.join(CLIPS_DIR, `${shortId}_captions.ass`);
  generateAssFile(wordTimings, assPath, {
    fontSize: 56,
    primaryColor: '&H0000FFFF&', // yellow
    outlineColor: '&H00000000&', // black
    outlineThickness: 6,
    playResX: 720,
    playResY: 1280,
    alignment: 2,
    marginV: 260,
  });

  // 4. Final compose: concat video + audio + burn ASS + add hook text at start
  const finalPath = path.join(VIDEO_DIR, `${shortId}.mp4`);

  // Escape colons/quotes in ASS path for ffmpeg filter
  const assPathEscaped = assPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");

  // Hook overlay: big bold text near top for first 2.5 seconds
  // Use drawtext for the hook text
  const hookSafe = hookText
    .toUpperCase()
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:');
  const fontFile = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

  const filterComplex = `ass='${assPathEscaped}',drawtext=fontfile='${fontFile}':text='${hookSafe}':fontcolor=yellow:fontsize=72:borderw=8:bordercolor=black:x=(w-text_w)/2:y=160:enable='between(t,0,2.5)'`;

  await execAsync(
    `ffmpeg -y -i "${concatVideoPath}" -i "${audioPath}" ` +
      `-vf "${filterComplex}" ` +
      `-c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -r 30 ` +
      `-c:a aac -b:a 192k -shortest ` +
      `-movflags +faststart "${finalPath}" -loglevel error`
  );

  // Cleanup intermediate files
  try {
    clipPaths.forEach(p => fs.unlinkSync(p));
    fs.unlinkSync(concatListPath);
    fs.unlinkSync(concatVideoPath);
    fs.unlinkSync(assPath);
  } catch {}

  return finalPath;
}

/**
 * Get duration of a video file.
 */
export async function getVideoDuration(videoPath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${videoPath}"`
  );
  return parseFloat(stdout.trim());
}
