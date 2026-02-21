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

// ───────────────────────────────────────────────────────────
//  Key detection helpers
// ───────────────────────────────────────────────────────────

// Strict chord token pattern – excludes section markers like [Verse], [Chorus], [Bridge]
const CHORD_TOKEN_RE =
  /^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4|\/[A-G][#b]?)*$/;

function isChordToken(token: string): boolean {
  return CHORD_TOKEN_RE.test(token);
}

// Enharmonic normalisation (sharp canonical form for comparison)
const ENHARMONIC: Record<string, string> = {
  Db: "C#",
  "D#": "Eb",
  Gb: "F#",
  "G#": "Ab",
  "A#": "Bb",
};
function normalizeNote(note: string): string {
  return ENHARMONIC[note] ?? note;
}

// Key signatures: diatonic chords (I ii iii IV V vi) for each major key
const KEY_SIGNATURES: Record<string, string[]> = {
  C: ["C", "Dm", "Em", "F", "G", "Am"],
  G: ["G", "Am", "Bm", "C", "D", "Em"],
  D: ["D", "Em", "F#m", "G", "A", "Bm"],
  A: ["A", "Bm", "C#m", "D", "E", "F#m"],
  E: ["E", "F#m", "G#m", "A", "B", "C#m"],
  B: ["B", "C#m", "D#m", "E", "F#", "G#m"],
  "F#": ["F#", "G#m", "A#m", "B", "C#", "D#m"],
  F: ["F", "Gm", "Am", "Bb", "C", "Dm"],
  Bb: ["Bb", "Cm", "Dm", "Eb", "F", "Gm"],
  Eb: ["Eb", "Fm", "Gm", "Ab", "Bb", "Cm"],
  Ab: ["Ab", "Bbm", "Cm", "Db", "Eb", "Fm"],
  Db: ["Db", "Ebm", "Fm", "Gb", "Ab", "Bbm"],
};

/**
 * Detect the key of a lyrics string using key-signature scoring.
 * Filters out section markers ([Verse], [Chorus], [Bridge], …) so they
 * don't pollute the chord frequency count.
 */
export function detectKey(lyrics: string): string {
  // Collect only real chord tokens from [Chord] notation
  const foundChords: string[] = [];
  const bracketRe = /\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = bracketRe.exec(lyrics)) !== null) {
    const inner = m[1];
    if (isChordToken(inner)) foundChords.push(inner);
  }

  // Also check bare chord lines (chord-over-lyrics format)
  const BARE_CHORD_LINE_RE =
    /^(?:\s*[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4)*\s+){2,}[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4)*\s*$/;
  for (const line of lyrics.split("\n")) {
    if (BARE_CHORD_LINE_RE.test(line)) {
      for (const token of line.trim().split(/\s+/)) {
        if (isChordToken(token)) foundChords.push(token);
      }
    }
  }

  if (foundChords.length === 0) return "C";

  // Score each candidate key against the found chords
  let bestKey = "C";
  let bestScore = -1;

  for (const [key, keyChords] of Object.entries(KEY_SIGNATURES)) {
    let score = 0;

    for (const chord of foundChords) {
      const p = parseRoot(chord);
      if (!p) continue;
      const normRoot = normalizeNote(p.root);
      const normChord = normRoot + p.rest;

      for (const kc of keyChords) {
        const kp = parseRoot(kc);
        if (!kp) continue;
        const kcNormRoot = normalizeNote(kp.root);
        const kcNormChord = kcNormRoot + kp.rest;
        if (normChord === kcNormChord || normRoot === kcNormRoot) {
          score++;
          break;
        }
      }
    }

    // Strong bonus when the first chord is the key's tonic (very common in worship songs)
    if (foundChords.length > 0) {
      const fp = parseRoot(foundChords[0]);
      if (fp && normalizeNote(fp.root) === normalizeNote(key)) score += 3;
    }

    // Smaller bonus when the last chord is the tonic (final resolution)
    if (foundChords.length > 1) {
      const lp = parseRoot(foundChords[foundChords.length - 1]);
      if (lp && normalizeNote(lp.root) === normalizeNote(key)) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  return bestKey;
}

/** Return semitone index (0-11) for a note name */
export function keyToSemitone(key: string): number {
  const idx = noteIndex(key);
  if (idx === -1) return 0; // safe fallback to C instead of wrapping -1 → 11
  return idx % 12;
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
