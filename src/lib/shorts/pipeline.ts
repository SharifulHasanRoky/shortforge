/**
 * Full pipeline orchestrator: hint -> script -> images -> voice -> video -> ready.
 * Updates the Short record in DB at each step.
 */
import { db } from '@/lib/db';
import { generateShortScript, logProgress, logActivity } from './script-generator';
import { generateImagesForShort } from './image-generator';
import { generateVoiceover } from './voice-generator';
import { composeVideo } from './video-composer';

export interface PipelineCallbacks {
  onStep?: (step: string, progress: number) => void;
}

export interface PipelineOptions {
  imageMode?: 'ai' | 'gradient';
}

/**
 * Run the full generation pipeline for a Short.
 * Updates DB at each step so the frontend can poll progress.
 */
export async function runGenerationPipeline(
  shortId: string,
  callbacks?: PipelineCallbacks,
  options?: PipelineOptions
): Promise<void> {
  try {
    // Step 1: Generate script (10%)
    await logProgress(shortId, 5, 'Generating script with AI...');
    callbacks?.onStep?.('Generating script', 5);

    const short = await db.short.findUnique({ where: { id: shortId } });
    if (!short) throw new Error('Short not found');

    const script = await generateShortScript(short.hint);

    await db.short.update({
      where: { id: shortId },
      data: {
        title: script.title,
        script: script.script,
        captionText: script.captionText,
        hook: script.hook,
        imagePrompts: JSON.stringify(script.imagePrompts),
        tags: script.tags.join(','),
      },
    });

    await logProgress(shortId, 15, 'Script ready. Generating voiceover...');
    callbacks?.onStep?.('Voiceover', 15);

    // Step 2: Generate voiceover (35%)
    const tts = await generateVoiceover(script.script, shortId);
    await db.short.update({
      where: { id: shortId },
      data: { audioPath: tts.audioPath },
    });

    await logProgress(shortId, 40, `Voiceover ready (${tts.durationSec.toFixed(1)}s). Generating images...`);
    callbacks?.onStep?.('Images', 40);

    // Step 3: Generate images (75%)
    const imagePaths = await generateImagesForShort(
      script.imagePrompts,
      shortId,
      (done, total) => {
        const p = 40 + Math.round((done / total) * 30);
        logProgress(shortId, p, `Generating image ${done}/${total}...`);
      },
      options?.imageMode || 'ai'
    );

    await db.short.update({
      where: { id: shortId },
      data: { imagePaths: JSON.stringify(imagePaths) },
    });

    await logProgress(shortId, 75, 'Images ready. Composing video...');
    callbacks?.onStep?.('Composing video', 75);

    // Step 4: Compose final video (95%)
    const videoPath = await composeVideo({
      shortId,
      imagePaths,
      audioPath: tts.audioPath,
      durationSec: tts.durationSec,
      wordTimings: tts.chunks,
      hookText: script.hook,
    });

    await db.short.update({
      where: { id: shortId },
      data: {
        videoPath,
        status: 'ready',
        progress: 100,
        progressStep: 'Ready to post',
      },
    });

    await logActivity(shortId, 'generate', `Short generated successfully: ${script.title}`);
    callbacks?.onStep?.('Done', 100);
  } catch (err: any) {
    console.error(`Pipeline failed for ${shortId}:`, err);
    await db.short.update({
      where: { id: shortId },
      data: {
        status: 'failed',
        error: err.message || 'Unknown error',
        progressStep: 'Failed',
      },
    });
    await logActivity(shortId, 'error', `Pipeline failed: ${err.message}`);
    throw err;
  }
}
