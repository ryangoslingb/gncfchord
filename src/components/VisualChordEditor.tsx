import React, { useState, useEffect, useMemo, useCallback } from "react";
import "./VisualChordEditor.css";

// Chord pattern to detect chord-only lines
const CHORD_PATTERN =
  /^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4|\/[A-G][#b]?)*$/i;

// All keys for transposition
const ALL_KEYS = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];
const CHROMATIC_SHARP = [
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
];
const CHROMATIC_FLAT = [
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
];

// Key signatures and their common chords for detection
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

// Normalize chord root (handle enharmonic equivalents)
function normalizeRoot(root: string): string {
  const normalized: Record<string, string> = {
    Db: "C#",
    "D#": "Eb",
    Gb: "F#",
    "G#": "Ab",
    "A#": "Bb",
  };
  return normalized[root] || root;
}

// Extract root from chord (e.g., "Am7" -> "A", "F#m" -> "F#")
function getChordRoot(chord: string): string {
  const match = chord.match(/^([A-G][#b]?)/);
  return match ? match[1] : "";
}

// Get semitone index of a note
function getNoteIndex(note: string): number {
  const normalized = normalizeRoot(note);
  const idx = CHROMATIC_SHARP.indexOf(normalized);
  return idx >= 0 ? idx : CHROMATIC_FLAT.indexOf(note);
}

// Transpose a single chord by semitones
function transposeChord(
  chord: string,
  semitones: number,
  useFlats: boolean = false,
): string {
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;

  const [, root, suffix] = match;
  const noteIndex = getNoteIndex(root);
  if (noteIndex < 0) return chord;

  const newIndex = (noteIndex + semitones + 12) % 12;
  const chromatic = useFlats ? CHROMATIC_FLAT : CHROMATIC_SHARP;

  return chromatic[newIndex] + suffix;
}

// Detect key from chord text
function detectKey(text: string): string {
  // Extract all chords from the text
  const chordRegex =
    /\[([^\]]+)\]|(?:^|\s)([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4)*)(?=\s|$)/gm;
  const foundChords: string[] = [];
  let match;

  while ((match = chordRegex.exec(text)) !== null) {
    const chord = match[1] || match[2];
    if (chord && isChord(chord)) {
      foundChords.push(chord);
    }
  }

  // Also check chord lines
  const lines = text.split("\n");
  lines.forEach((line) => {
    if (isChordLine(line)) {
      const tokens = line.trim().split(/\s+/);
      tokens.forEach((token) => {
        if (isChord(token)) foundChords.push(token);
      });
    }
  });

  if (foundChords.length === 0) return "C";

  // Score each key based on how many chords match
  let bestKey = "C";
  let bestScore = 0;

  Object.entries(KEY_SIGNATURES).forEach(([key, keyChords]) => {
    let score = 0;
    foundChords.forEach((chord) => {
      const root = getChordRoot(chord);
      const normalizedChord =
        normalizeRoot(root) + chord.substring(root.length);

      // Check if this chord (or its root) matches key chords
      if (
        keyChords.some((kc) => {
          const kcRoot = getChordRoot(kc);
          const normalizedKc =
            normalizeRoot(kcRoot) + kc.substring(kcRoot.length);
          return (
            normalizedChord === normalizedKc ||
            normalizeRoot(root) === normalizeRoot(kcRoot)
          );
        })
      ) {
        score++;
      }
    });

    // Bonus for first chord matching the key
    if (foundChords.length > 0) {
      const firstRoot = normalizeRoot(getChordRoot(foundChords[0]));
      if (normalizeRoot(key) === firstRoot) score += 2;
    }

    // Bonus for last chord matching the key (common cadence)
    if (foundChords.length > 1) {
      const lastRoot = normalizeRoot(
        getChordRoot(foundChords[foundChords.length - 1]),
      );
      if (normalizeRoot(key) === lastRoot) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  });

  return bestKey;
}

// Transpose all chords in text
function transposeText(text: string, fromKey: string, toKey: string): string {
  if (fromKey === toKey) return text;

  const fromIndex = getNoteIndex(fromKey);
  const toIndex = getNoteIndex(toKey);
  const semitones = (toIndex - fromIndex + 12) % 12;

  // Use flats if target key typically uses flats
  const useFlats = ["F", "Bb", "Eb", "Ab", "Db", "Gb"].includes(toKey);

  // Replace [Chord] notation
  let result = text.replace(/\[([^\]]+)\]/g, (match, chord) => {
    return `[${transposeChord(chord, semitones, useFlats)}]`;
  });

  // Also transpose chord lines (lines that are mostly chords)
  const lines = result.split("\n");
  const transposedLines = lines.map((line) => {
    if (isChordLine(line)) {
      return line.replace(
        /([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4)*)/g,
        (chord) => {
          if (isChord(chord)) {
            return transposeChord(chord, semitones, useFlats);
          }
          return chord;
        },
      );
    }
    return line;
  });

  return transposedLines.join("\n");
}

// Export utilities for use in other components
export { detectKey, transposeText, ALL_KEYS };

interface ChordPosition {
  chord: string;
  position: number;
}

interface ParsedLine {
  type: "lyrics" | "chords" | "empty";
  text: string;
  chords?: ChordPosition[];
}

interface VisualChordEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDetected?: (key: string) => void;
}

// Check if a token is a chord
function isChord(token: string): boolean {
  return CHORD_PATTERN.test(token.trim());
}

// Check if a line is a chord line (contains mostly chords)
function isChordLine(line: string): boolean {
  if (!line.trim()) return false;
  const tokens = line.trim().split(/\s+/);
  if (tokens.length === 0) return false;
  const chordCount = tokens.filter(isChord).length;
  // If more than 60% are chords, it's a chord line
  return chordCount / tokens.length >= 0.6;
}

// Parse chord-over-lyrics format to internal [Chord] notation
function parseChordSheet(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];

    // Empty line
    if (!currentLine.trim()) {
      result.push("");
      i++;
      continue;
    }

    // Check if current line is chords and next line is lyrics
    if (
      isChordLine(currentLine) &&
      nextLine !== undefined &&
      !isChordLine(nextLine) &&
      nextLine.trim()
    ) {
      // Merge chords with lyrics
      const chords = parseChordPositions(currentLine);
      const mergedLine = mergeChordWithLyrics(chords, nextLine);
      result.push(mergedLine);
      i += 2; // Skip both lines
    } else if (isChordLine(currentLine)) {
      // Standalone chord line - convert to [Chord] format
      const chords = currentLine.trim().split(/\s+/).filter(isChord);
      result.push(chords.map((c) => `[${c}]`).join(" "));
      i++;
    } else {
      // Regular lyrics line (may already have [Chord] notation)
      result.push(currentLine);
      i++;
    }
  }

  return result.join("\n");
}

// Parse chord positions from a chord line
function parseChordPositions(chordLine: string): ChordPosition[] {
  const positions: ChordPosition[] = [];
  const regex =
    /([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13|6|2|4|\/[A-G][#b]?)*)/gi;
  let match;

  while ((match = regex.exec(chordLine)) !== null) {
    positions.push({
      chord: match[1],
      position: match.index,
    });
  }

  return positions;
}

// Merge chords into lyrics based on position
function mergeChordWithLyrics(chords: ChordPosition[], lyrics: string): string {
  if (chords.length === 0) return lyrics;

  let result = "";
  let lastPos = 0;

  // Sort chords by position
  chords.sort((a, b) => a.position - b.position);

  chords.forEach((chord, idx) => {
    const pos = Math.min(chord.position, lyrics.length);

    // Add lyrics before this chord
    if (pos > lastPos) {
      result += lyrics.substring(lastPos, pos);
    } else if (idx > 0) {
      // If multiple chords at same position, add space
      result += " ";
    }

    // Add chord
    result += `[${chord.chord}]`;
    lastPos = pos;
  });

  // Add remaining lyrics
  if (lastPos < lyrics.length) {
    result += lyrics.substring(lastPos);
  }

  return result;
}

// Convert [Chord] notation back to chord-over-lyrics format for display
function toChordSheet(notation: string): string {
  const lines = notation.split("\n");
  const result: string[] = [];

  lines.forEach((line) => {
    if (!line.includes("[")) {
      result.push(line);
      return;
    }

    // Extract chords and their positions
    let chordLine = "";
    let lyricLine = "";
    let currentPos = 0;

    const regex = /\[([^\]]+)\]([^\[]*)/g;
    let match;
    let lastIndex = 0;

    // Handle text before first chord
    const firstChordMatch = line.match(/\[/);
    if (firstChordMatch && firstChordMatch.index && firstChordMatch.index > 0) {
      const textBefore = line.substring(0, firstChordMatch.index);
      lyricLine += textBefore;
      chordLine += " ".repeat(textBefore.length);
      currentPos = textBefore.length;
    }

    while ((match = regex.exec(line)) !== null) {
      const chord = match[1];
      const text = match[2] || "";

      // Pad chord line to current position
      while (chordLine.length < currentPos) {
        chordLine += " ";
      }

      // Add chord
      chordLine += chord;

      // Add lyrics
      lyricLine += text;
      currentPos = lyricLine.length;
    }

    // If we have chords, output both lines
    if (chordLine.trim()) {
      result.push(chordLine);
      result.push(lyricLine);
    } else {
      result.push(line);
    }
  });

  return result.join("\n");
}

const VisualChordEditor: React.FC<VisualChordEditorProps> = ({
  value,
  onChange,
  onKeyDetected,
}) => {
  const [editText, setEditText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [lastDetectedKey, setLastDetectedKey] = useState<string | null>(null);

  // Initialize with chord-sheet format and detect key
  useEffect(() => {
    let initialText = value;
    if (value.includes("[")) {
      // Convert from [Chord] notation to chord-over-lyrics
      initialText = toChordSheet(value);
    }
    setEditText(initialText);

    // Detect key on initial load
    if (initialText.trim() && onKeyDetected) {
      const detected = detectKey(initialText);
      setLastDetectedKey(detected);
      onKeyDetected(detected);
    }
  }, []);

  // Sync editor when value arrives late (async song load)
  useEffect(() => {
    if (value && !editText) {
      let initialText = value;
      if (value.includes("[")) {
        initialText = toChordSheet(value);
      }
      setEditText(initialText);
      if (initialText.trim() && onKeyDetected) {
        const detected = detectKey(initialText);
        setLastDetectedKey(detected);
        onKeyDetected(detected);
      }
    }
  }, [value]);

  // Parse the preview lines
  const previewLines = useMemo(() => {
    const text = editText;
    const lines = text.split("\n");
    const result: ParsedLine[] = [];

    let i = 0;
    while (i < lines.length) {
      const currentLine = lines[i];
      const nextLine = lines[i + 1];

      if (!currentLine.trim()) {
        result.push({ type: "empty", text: "" });
        i++;
        continue;
      }

      if (
        isChordLine(currentLine) &&
        nextLine !== undefined &&
        !isChordLine(nextLine) &&
        nextLine.trim()
      ) {
        // Chord + lyrics pair
        result.push({
          type: "lyrics",
          text: nextLine,
          chords: parseChordPositions(currentLine),
        });
        i += 2;
      } else if (isChordLine(currentLine)) {
        // Standalone chord line
        result.push({
          type: "chords",
          text: currentLine,
        });
        i++;
      } else if (currentLine.includes("[")) {
        // Already has [Chord] notation - parse it
        const chords: ChordPosition[] = [];
        let plainText = "";
        let pos = 0;
        const regex = /\[([^\]]+)\]([^\[]*)/g;
        let match;
        let lastIdx = 0;

        // Text before first chord
        const firstMatch = currentLine.match(/\[/);
        if (firstMatch && firstMatch.index && firstMatch.index > 0) {
          plainText = currentLine.substring(0, firstMatch.index);
          pos = plainText.length;
        }

        while ((match = regex.exec(currentLine)) !== null) {
          chords.push({ chord: match[1], position: pos });
          plainText += match[2] || "";
          pos = plainText.length;
        }

        result.push({
          type: "lyrics",
          text: plainText,
          chords,
        });
        i++;
      } else {
        // Plain lyrics
        result.push({ type: "lyrics", text: currentLine });
        i++;
      }
    }

    return result;
  }, [editText]);

  const handleTextChange = useCallback(
    (newText: string) => {
      setEditText(newText);
      // Convert to [Chord] notation and pass to parent
      const notation = parseChordSheet(newText);
      onChange(notation);

      // Detect key if text has chords and callback is provided
      if (onKeyDetected && newText.trim()) {
        const detected = detectKey(newText);
        if (detected !== lastDetectedKey) {
          setLastDetectedKey(detected);
          onKeyDetected(detected);
        }
      }
    },
    [onChange, onKeyDetected, lastDetectedKey],
  );

  return (
    <div className="visual-chord-editor">
      <div className="editor-toolbar">
        <button
          className={`toolbar-tab ${!showPreview ? "active" : ""}`}
          onClick={() => setShowPreview(false)}
        >
          Edit
        </button>
        <button
          className={`toolbar-tab ${showPreview ? "active" : ""}`}
          onClick={() => setShowPreview(true)}
        >
          Preview
        </button>
      </div>

      {!showPreview ? (
        <div className="chord-sheet-edit">
          <p className="hint-text">
            Type chords on one line, lyrics on the next line below it. Chords
            will auto-align above the lyrics.
          </p>
          <textarea
            className="chord-sheet-textarea"
            value={editText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={`Example format:\n\nAm       G        C\nAmazing  grace    how sweet\nF        C    G\nthe sound that saved\n\nJust type your chord line,\nthen lyrics directly below!`}
            rows={14}
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="chord-sheet-preview">
          {previewLines.length === 0 ||
          (previewLines.length === 1 && !previewLines[0].text) ? (
            <div className="empty-preview">
              <p>
                No content yet. Switch to Edit tab to add lyrics and chords.
              </p>
            </div>
          ) : (
            <div className="preview-content">
              {previewLines.map((line, idx) => {
                if (line.type === "empty") {
                  return (
                    <div key={idx} className="preview-line empty">
                      &nbsp;
                    </div>
                  );
                }

                if (line.type === "chords") {
                  return (
                    <div key={idx} className="preview-line chords-only">
                      {line.text
                        .split(/\s+/)
                        .filter(Boolean)
                        .map((chord, ci) => (
                          <span key={ci} className="standalone-chord">
                            {chord}
                          </span>
                        ))}
                    </div>
                  );
                }

                // Lyrics with chords
                return (
                  <div key={idx} className="preview-line with-chords">
                    {renderLyricsWithChords(line.text, line.chords || [])}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Render lyrics with chords positioned above
function renderLyricsWithChords(text: string, chords: ChordPosition[]) {
  if (chords.length === 0) {
    return <span className="lyric-word">{text}</span>;
  }

  const elements: React.ReactNode[] = [];
  let lastPos = 0;

  // Sort chords by position
  const sortedChords = [...chords].sort((a, b) => a.position - b.position);

  sortedChords.forEach((chord, idx) => {
    const pos = Math.min(chord.position, text.length);

    // Add text before this chord
    if (pos > lastPos) {
      const segment = text.substring(lastPos, pos);
      elements.push(
        <span key={`text-${idx}`} className="lyric-segment">
          {segment}
        </span>,
      );
    }

    // Find the word at this position
    const remainingText = text.substring(pos);
    const wordMatch = remainingText.match(/^\S*/);
    const word = wordMatch ? wordMatch[0] : "";

    // Add chord with word below
    elements.push(
      <span key={`chord-${idx}`} className="chord-word-pair">
        <span className="chord-above">{chord.chord}</span>
        <span className="word-below">{word}</span>
      </span>,
    );

    lastPos = pos + word.length;
  });

  // Add remaining text
  if (lastPos < text.length) {
    elements.push(
      <span key="remaining" className="lyric-segment">
        {text.substring(lastPos)}
      </span>,
    );
  }

  return elements;
}

export default VisualChordEditor;
