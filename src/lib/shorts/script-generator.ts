/**
 * LLM-powered script generator for motivational YouTube Shorts.
 * Generates: title, hook, script, caption text, image prompts, tags.
 */
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

export interface GeneratedScript {
  title: string;
  hook: string;          // 3-6 word punchy hook
  script: string;        // 30-45 sec voiceover, ~110-150 words
  captionText: string;   // same as script but cleaned for subtitles
  imagePrompts: string[];// 4 image prompts matching script beats
  tags: string[];        // 6-10 hashtags
}

let zaiInstance: any = null;
async function getZAI() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

const SYSTEM_PROMPT = `You are a viral YouTube Shorts scriptwriter specialized in USA motivational content.
Your style is punchy, fast-paced, Alex Hormozi / Chris Williamson inspired.
Rules:
- Hook in first 3 seconds (question or bold statement)
- Total length: 110-150 words (about 30-45 seconds spoken)
- Use short, punchy sentences. No fluff.
- End with a CTA: "follow for daily motivation" style
- Language: American English, conversational, no profanity
- Tone: intense, inspiring, no cliches like "rise and grind"

You MUST respond with a single valid JSON object. No markdown, no comments, no trailing commas. Always escape quotes inside strings.`;

/**
 * Try to extract and parse a JSON object from a possibly-noisy LLM response.
 * 1. Strip code fences.
 * 2. Try direct JSON.parse.
 * 3. Try regex extraction of {...} block.
 * 4. Try field-by-field regex extraction as last resort.
 */
function parseScriptJSON(raw: string): GeneratedScript {
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();

  // 1. Direct parse
  try {
    return coerce(JSON.parse(text));
  } catch {}

  // 2. Find first {...} block
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return coerce(JSON.parse(m[0]));
    } catch {}
  }

  // 3. Field-by-field regex extraction (last resort, lenient)
  const extractStr = (key: string): string | null => {
    const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*?)"`, 's');
    const mm = text.match(re);
    return mm ? mm[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : null;
  };
  const extractArray = (key: string): string[] | null => {
    const re = new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)\\]`, 's');
    const mm = text.match(re);
    if (!mm) return null;
    // extract all quoted strings inside the array
    const items = mm[1].match(/"((?:[^"\\\\]|\\\\.)*?)"/g);
    if (!items) return null;
    return items.map(s => s.replace(/^"|"$/g, '').replace(/\\"/g, '"').replace(/\\n/g, '\n'));
  };

  const title = extractStr('title');
  const hook = extractStr('hook');
  const script = extractStr('script');
  const captionText = extractStr('captionText');
  const imagePrompts = extractArray('imagePrompts');
  const tags = extractArray('tags');

  if (!title || !script || !imagePrompts || imagePrompts.length === 0) {
    throw new Error('Could not extract required fields from LLM response: ' + text.slice(0, 200));
  }

  return coerce({
    title,
    hook: hook || script.split(' ').slice(0, 5).join(' '),
    script,
    captionText: captionText || script,
    imagePrompts,
    tags: tags && tags.length > 0 ? tags : ['#motivation', '#mindset', '#success', '#discipline'],
  });
}

function coerce(obj: any): GeneratedScript {
  return {
    title: String(obj.title || '').slice(0, 80),
    hook: String(obj.hook || '').slice(0, 60),
    script: String(obj.script || ''),
    captionText: String(obj.captionText || obj.script || ''),
    imagePrompts: Array.isArray(obj.imagePrompts)
      ? obj.imagePrompts.slice(0, 4).map((s: any) => String(s))
      : [],
    tags: Array.isArray(obj.tags) && obj.tags.length > 0
      ? obj.tags.map((s: any) => String(s))
      : ['#motivation', '#mindset', '#success', '#discipline'],
  };
}

export async function generateShortScript(hint: string): Promise<GeneratedScript> {
  const zai = await getZAI();
  const userPrompt = `Topic hint: "${hint}"

Write a YouTube Shorts script for this hint. Generate exactly 4 image prompts that match the emotional beats of the script (cinematic, dark moody aesthetic, abstract, no text in images).

Return JSON with this exact shape:
{
  "title": "string - max 60 chars, clickbait but honest",
  "hook": "string - 3 to 6 words, the very first line",
  "script": "string - the full voiceover, 110-150 words, plain text no quotes",
  "captionText": "string - same as script, cleaned for on-screen captions",
  "imagePrompts": ["string", "string", "string", "string"] - exactly 4 cinematic image prompts (no text in image),
  "tags": ["#motivation", ...] - 6 to 10 hashtags
}`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    thinking: { type: 'disabled' },
  });

  const raw = completion.choices[0]?.message?.content ?? '';
  return parseScriptJSON(raw);
}

/**
 * Update an existing Short record with progress.
 */
export async function logProgress(shortId: string, progress: number, step: string) {
  await db.short.update({
    where: { id: shortId },
    data: { progress, progressStep: step },
  });
}

export async function logActivity(shortId: string | null, action: string, message: string) {
  await db.activityLog.create({
    data: { shortId, action, message },
  });
}
