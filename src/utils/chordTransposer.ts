// ───────────────────────────────────────────────────────────
//  Chromatic scales
// ───────────────────────────────────────────────────────────
const SHARP_NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;
const FLAT_NOTES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

function noteIndex(note: string): number {
  let idx = (SHARP_NOTES as readonly string[]).indexOf(note);
  if (idx !== -1) return idx;
  idx = (FLAT_NOTES as readonly string[]).indexOf(note);
  return idx; // -1 if unknown
}

function isFlat(note: string): boolean {
  // A note is flat when it contains a lowercase 'b' AND is not the note "B" itself
  return note.length > 1 && note[1] === "b";
}

function transposeNote(
  note: string,
  semitones: number,
  useFlats: boolean,
): string {
  const idx = noteIndex(note);
  if (idx === -1) return note;
  const newIdx = (((idx + semitones) % 12) + 12) % 12;
  return useFlats ? FLAT_NOTES[newIdx] : SHARP_NOTES[newIdx];
}

// ───────────────────────────────────────────────────────────
//  Root parser – returns { root, rest } or null
// ───────────────────────────────────────────────────────────
function parseRoot(chord: string): { root: string; rest: string } | null {
  if (!chord) return null;
  const two = chord.substring(0, 2);
  if (
    (SHARP_NOTES as readonly string[]).includes(two) ||
    (FLAT_NOTES as readonly string[]).includes(two)
  ) {
    return { root: two, rest: chord.substring(2) };
  }
  const one = chord.substring(0, 1);
  if ((SHARP_NOTES as readonly string[]).includes(one)) {
    return { root: one, rest: chord.substring(1) };
  }
  return null;
}

// ───────────────────────────────────────────────────────────
//  Public: transpose a single chord token (e.g. "Am", "C#maj7", "G/B")
// ───────────────────────────────────────────────────────────
export function transposeChord(
  chord: string,
  semitones: number,
  useFlats?: boolean,
): string {
  if (semitones === 0) return chord;
  const parsed = parseRoot(chord);
  if (!parsed) return chord;

  const { root, rest } = parsed;
  const flat = useFlats !== undefined ? useFlats : isFlat(root);
  const newRoot = transposeNote(root, semitones, flat);

  // Handle slash chords like "C/G"
  if (rest.startsWith("/")) {
    const bassParsed = parseRoot(rest.substring(1));
    if (bassParsed) {
      const newBass = transposeNote(bassParsed.root, semitones, flat);
      return `${newRoot}/${newBass}${bassParsed.rest}`;
    }
  }

  return newRoot + rest;
}

// ───────────────────────────────────────────────────────────
//  Public: transpose every [Chord] marker inside a lyrics string
// ───────────────────────────────────────────────────────────
export function transposeLyrics(
  lyrics: string,
  semitones: number,
  useFlats?: boolean,
): string {
  if (semitones === 0) return lyrics;
  return lyrics.replace(/\[([^\]]+)\]/g, (_, chord) => {
    return `[${transposeChord(chord, semitones, useFlats)}]`;
  });
}

// ───────────────────────────────────────────────────────────
//  Public: key helpers
// ───────────────────────────────────────────────────────────
export const DISPLAY_KEYS = [
  { label: "C", sharpsLabel: "C", flatsLabel: "C", semitones: 0 },
  { label: "C#/Db", sharpsLabel: "C#", flatsLabel: "Db", semitones: 1 },
  { label: "D", sharpsLabel: "D", flatsLabel: "D", semitones: 2 },
  { label: "D#/Eb", sharpsLabel: "D#", flatsLabel: "Eb", semitones: 3 },
  { label: "E", sharpsLabel: "E", flatsLabel: "E", semitones: 4 },
  { label: "F", sharpsLabel: "F", flatsLabel: "F", semitones: 5 },
  { label: "F#/Gb", sharpsLabel: "F#", flatsLabel: "Gb", semitones: 6 },
  { label: "G", sharpsLabel: "G", flatsLabel: "G", semitones: 7 },
  { label: "G#/Ab", sharpsLabel: "G#", flatsLabel: "Ab", semitones: 8 },
  { label: "A", sharpsLabel: "A", flatsLabel: "A", semitones: 9 },
  { label: "A#/Bb", sharpsLabel: "A#", flatsLabel: "Bb", semitones: 10 },
  { label: "B", sharpsLabel: "B", flatsLabel: "B", semitones: 11 },
];

/** Semitone distance from `from` to `to` (always 0-11) */
export function semitoneDiff(from: string, to: string): number {
  const a = noteIndex(from);
  const b = noteIndex(to);
  if (a === -1 || b === -1) return 0;
  return (b - a + 12) % 12;
}

/** Detect the most-common root note in a lyrics string */
export function detectKey(lyrics: string): string {
  const matches = lyrics.match(/\[([^\]]+)\]/g);
  if (!matches) return "C";
  const freq: Record<string, number> = {};
  for (const m of matches) {
    const chord = m.slice(1, -1);
    const parsed = parseRoot(chord);
    if (parsed) freq[parsed.root] = (freq[parsed.root] ?? 0) + 1;
  }
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : "C";
}

/** Return semitone index (0-11) for a note name */
export function keyToSemitone(key: string): number {
  return ((noteIndex(key) % 12) + 12) % 12;
}

// ───────────────────────────────────────────────────────────
//  Lyrics parser – turns a raw lyrics string into renderable tokens
// ───────────────────────────────────────────────────────────
export interface ChordToken {
  chord: string; // "" when no chord precedes this text segment
  text: string;
}

export interface ParsedLine {
  tokens: ChordToken[];
  hasChords: boolean;
}

export function parseLyricsLine(line: string): ParsedLine {
  const segments = line.split(/(\[[^\]]+\])/g);
  const tokens: ChordToken[] = [];
  let pendingChord = "";
  let hasChords = false;

  for (const seg of segments) {
    if (/^\[[^\]]+\]$/.test(seg)) {
      // chord marker
      if (pendingChord !== "") tokens.push({ chord: pendingChord, text: "" });
      pendingChord = seg.slice(1, -1);
      hasChords = true;
    } else {
      tokens.push({ chord: pendingChord, text: seg });
      pendingChord = "";
    }
  }
  if (pendingChord !== "") tokens.push({ chord: pendingChord, text: "" });

  return { tokens, hasChords };
}

export function parseLyrics(lyrics: string): ParsedLine[] {
  return lyrics.split("\n").map(parseLyricsLine);
}
