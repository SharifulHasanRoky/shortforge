/**
 * TTS voiceover generator using z-ai-web-dev-sdk.
 * Voice 'jam' is English gentleman style, 'tongtong' is warm.
 * We use 'jam' for USA male motivational voice.
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

const AUDIO_DIR = '/home/z/my-project/storage/audio';

export interface TTSResult {
  audioPath: string;
  durationSec: number;
  chunks: { text: string; start: number; end: number }[];
}

/**
 * Split long text into TTS-friendly chunks (<= 1000 chars, sentence-aware).
 */
export function splitTextForTTS(text: string, maxLen = 900): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const chunks: string[] = [];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length <= maxLen) {
      current += s;
    } else {
      if (current.trim()) chunks.push(current.trim());
      current = s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * Generate voiceover audio for a script. Returns audio path + word timings
 * (estimated from chunk durations).
 */
export async function generateVoiceover(
  script: string,
  shortId: string
): Promise<TTSResult> {
  if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const chunks = splitTextForTTS(script);
  const chunkPaths: string[] = [];

  // Generate each chunk as WAV then we'll concat
  for (let i = 0; i < chunks.length; i++) {
    const chunkPath = path.join(AUDIO_DIR, `${shortId}_chunk_${i}.wav`);
    const zai = await getZAI();
    const response = await zai.audio.tts.create({
      input: chunks[i],
      voice: 'jam', // English male - closest to USA motivational voice
      speed: 1.05,
      response_format: 'wav',
      stream: false,
    });
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    fs.writeFileSync(chunkPath, buffer);
    chunkPaths.push(chunkPath);
  }

  // Concat all chunks into a single WAV
  const finalPath = path.join(AUDIO_DIR, `${shortId}.wav`);
  if (chunkPaths.length === 1) {
    fs.copyFileSync(chunkPaths[0], finalPath);
  } else {
    const listFile = path.join(AUDIO_DIR, `${shortId}_list.txt`);
    fs.writeFileSync(
      listFile,
      chunkPaths.map(p => `file '${p}'`).join('\n')
    );
    await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${finalPath}" -loglevel error`
    );
    // cleanup
    try {
      fs.unlinkSync(listFile);
      chunkPaths.forEach(p => fs.unlinkSync(p));
    } catch {}
  }

  // Get duration
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${finalPath}"`
  );
  const durationSec = parseFloat(stdout.trim());

  // Build word-level timing by distributing words across duration
  const words = script.split(/\s+/).filter(Boolean);
  const wordDuration = durationSec / words.length;
  const wordTimings: { text: string; start: number; end: number }[] = [];
  for (let i = 0; i < words.length; i++) {
    wordTimings.push({
      text: words[i],
      start: i * wordDuration,
      end: (i + 1) * wordDuration,
    });
  }

  return {
    audioPath: finalPath,
    durationSec,
    chunks: wordTimings,
  };
}

/**
 * Get duration of an audio file in seconds.
 */
export async function getAudioDuration(audioPath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioPath}"`
  );
  return parseFloat(stdout.trim());
}
