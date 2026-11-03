/**
 * Generate ASS subtitle file with Hormozi-style word-by-word pop captions.
 * - Yellow bold text with thick black outline
 * - Each word appears for its duration, then disappears
 * - Centered horizontally, positioned ~75% down (safe area for Shorts)
 */
import fs from 'fs';

export interface WordTiming {
  text: string;
  start: number;
  end: number;
}

function fmtTime(sec: number): string {
  // ASS time format: H:MM:SS.cs (centiseconds, 2 digits)
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.round((sec - Math.floor(sec)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/**
 * Generate ASS subtitle file.
 * Words with same start time (within 50ms) are grouped on one line.
 */
export function generateAssFile(
  words: WordTiming[],
  outputPath: string,
  options: {
    fontSize?: number;
    primaryColor?: string; // hex BGR format &H00BBGGRR&
    outlineColor?: string;
    outlineThickness?: number;
    playResX?: number;
    playResY?: number;
    alignment?: number; // 2 = bottom center, 5 = middle center, 8 = top center
    marginV?: number;
  } = {}
): string {
  const {
    fontSize = 58,
    primaryColor = '&H0000FFFF&', // yellow in BGR
    outlineColor = '&H00000000&', // black
    outlineThickness = 6,
    playResX = 720,
    playResY = 1280,
    alignment = 2, // bottom-center
    marginV = 280, // push up so captions sit in lower-third safe area
  } = options;

  const header = `[Script Info]
Title: Hormozi Captions
ScriptType: v4.00+
PlayResX: ${playResX}
PlayResY: ${playResY}
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Pop,Arial Black,${fontSize},${primaryColor},&H000000FF&,${outlineColor},&H00000000&,-1,0,0,0,100,100,0,0,1,${outlineThickness},0,${alignment},40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events: string[] = [];
  // Group consecutive words that overlap or are within 80ms of each other (no big gap)
  // For Hormozi pop, we want 1-3 words visible at a time
  const GROUP_GAP_MS = 80 / 1000;
  const GROUP_MAX_WORDS = 3;

  let i = 0;
  while (i < words.length) {
    const group: WordTiming[] = [words[i]];
    let j = i + 1;
    while (j < words.length && group.length < GROUP_MAX_WORDS) {
      const prev = group[group.length - 1];
      const cur = words[j];
      // continue group if words are close in time and there's no big gap
      if (cur.start - prev.end < GROUP_GAP_MS) {
        group.push(cur);
        j++;
      } else break;
    }
    const startT = group[0].start;
    // each group ends at the last word's end + tiny bit so pop is visible
    const endT = Math.max(group[group.length - 1].end, startT + 0.25);
    const text = group
      .map(w => w.text.toUpperCase())
      .join(' ');

    // Escape special chars in ASS text
    const safeText = text.replace(/\\n/g, ' ').replace(/\{|\}/g, '');
    events.push(
      `Dialogue: 0,${fmtTime(startT)},${fmtTime(endT)},Pop,,0,0,0,,${safeText}`
    );
    i = j;
  }

  const ass = header + events.join('\n') + '\n';
  fs.writeFileSync(outputPath, ass, 'utf8');
  return outputPath;
}
