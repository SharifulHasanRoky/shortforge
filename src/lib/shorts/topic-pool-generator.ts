/**
 * Generate a pool of topic ideas for a campaign niche.
 * Uses LLM to brainstorm fresh, viral-worthy topics.
 */
import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: any = null;
async function getZAI() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

const NICHE_SYSTEM_PROMPTS: Record<string, string> = {
  motivational: `You generate viral motivational YouTube Shorts topic ideas for the USA audience.
Topics should be: punchy, specific, shareable, avoid clichés like "rise and grind" or "believe in yourself".
Mix of: mindset shifts, productivity hacks, success principles, habits, discipline, focus, resilience.
Each topic should be writable as a 30-45 second voiceover.`,
  'fun facts': `You generate viral "did you know" Shorts topic ideas for the USA audience.
Topics should be: surprising, mind-blowing, shareable, educational but entertaining.
Examples of tone: "Sharks are older than trees", "Bananas are berries but strawberries aren't".`,
  history: `You generate viral history/mystery Shorts topic ideas for the USA audience.
Topics should be: untold stories, mysterious events, shocking historical facts, conspiracy theories.
Make them sound like a Netflix documentary hook.`,
  tech: `You generate viral tech/AI Shorts topic ideas for the USA audience.
Topics should be: future predictions, AI tools, mind-blowing tech facts, productivity tech.`,
  mindset: `You generate viral mindset/psychology Shorts topic ideas for the USA audience.
Topics should be: cognitive biases, mental models, productivity psychology, decision-making.`,
};

export async function generateTopicPool(
  niche: string,
  count: number = 30,
  customPrompt?: string
): Promise<string[]> {
  const zai = await getZAI();
  const systemPrompt = customPrompt || NICHE_SYSTEM_PROMPTS[niche.toLowerCase()] || NICHE_SYSTEM_PROMPTS.motivational;

  const userPrompt = `Generate exactly ${count} unique YouTube Shorts topic ideas for the "${niche}" niche.

Return ONLY a JSON array of strings, no markdown, no explanation. Each string should be a 5-12 word topic idea that can be turned into a 30-45 second motivational Short.

Example format: ["topic 1 here", "topic 2 here", ...]`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    thinking: { type: 'disabled' },
  });

  const raw = completion.choices[0]?.message?.content ?? '';
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();

  let topics: string[];
  try {
    topics = JSON.parse(cleaned);
  } catch {
    // Try to extract array
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (!m) throw new Error('LLM did not return valid JSON array: ' + cleaned.slice(0, 200));
    topics = JSON.parse(m[0]);
  }

  if (!Array.isArray(topics) || topics.length === 0) {
    throw new Error('LLM returned no topics');
  }

  // Clean: trim, dedupe, only strings
  const seen = new Set<string>();
  const cleaned_topics = topics
    .filter((t) => typeof t === 'string' && t.trim().length > 0)
    .map((t) => t.trim())
    .filter((t) => {
      const k = t.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  return cleaned_topics.slice(0, count);
}

/**
 * Check if a campaign's topic pool is running low and needs replenishment.
 */
export function needsReplenishment(pool: TopicEntry[], threshold: number = 5): boolean {
  const unused = pool.filter((t) => !t.used);
  return unused.length < threshold;
}

export interface TopicEntry {
  topic: string;
  used: boolean;
  usedAt?: string; // ISO date when consumed
  shortId?: string; // resulting short id
}
