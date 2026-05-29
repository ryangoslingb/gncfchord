import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonBackButton,
  IonFooter,
  IonToast,
} from "@ionic/react";
import {
  createOutline,
  removeOutline,
  addOutline,
  sunnyOutline,
  moonOutline,
  playOutline,
  pauseOutline,
  textOutline,
  chevronDownOutline,
  chevronUpOutline,
} from "ionicons/icons";
import { useHistory, useParams } from "react-router-dom";
import {
  transposeLyrics,
  detectKey,
  parseLyrics,
  ParsedLine,
  keyToSemitone,
  semitoneDiff,
} from "../utils/chordTransposer";
import { getSongById } from "../utils/firebaseStorage";
import { Song } from "../types";
import "./SongView.css";

// All 12 chromatic keys (simplified - no duplicates)
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

// Keys where flat notation is conventional
const FLAT_SEMITONES = new Set([1, 3, 5, 8, 10]);

function autoFlats(semitone: number): boolean {
  return FLAT_SEMITONES.has(((semitone % 12) + 12) % 12);
}

// Check if text is a section marker like [Intro], [Verse 1], [Chorus]
function getSectionLabel(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const bracketMatch = trimmed.match(/^\[(.+)\]$/);
  if (bracketMatch && !/^\[[A-G][#b]?/.test(trimmed)) {
    const label = bracketMatch[1].trim();
    return label || "Section";
  }

  const plainMatch = trimmed.match(
    /^(intro|verse|pre-?chorus|chorus|bridge|tag|outro|ending|refrain|interlude|breakdown)(\s*\d+)?$/i,
  );
  if (plainMatch) return trimmed;

  return null;
}

function getSectionLabelFromLine(line: ParsedLine): string | null {
  const text = line.tokens.map((t) => t.text).join("");
  const plainLabel = getSectionLabel(text);
  if (plainLabel) return plainLabel;

  if (!text.trim()) {
    const chordLabels = line.tokens.map((t) => t.chord).filter(Boolean);
    if (chordLabels.length === 1) {
      const chordLabel = getSectionLabel(chordLabels[0]);
      if (chordLabel) return chordLabel;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────
//  Chord-over-lyrics renderer
// ─────────────────────────────────────────────────
const LyricsLine: React.FC<{ line: ParsedLine; fontSize: number }> = ({
  line,
  fontSize,
}) => {
  const text = line.tokens.map((t) => t.text).join("");
  const sectionLabel = getSectionLabelFromLine(line);
  if (!line.hasChords) {
    return (
      <div
        className={`lyrics-plain-line ${sectionLabel ? "section-marker" : ""}`}
        style={{ fontSize }}
      >
        {text === "" ? <span>&nbsp;</span> : text}
      </div>
    );
  }
  if (sectionLabel && !text.trim()) {
    return (
      <div className="lyrics-plain-line section-marker" style={{ fontSize }}>
        {sectionLabel}
      </div>
    );
  }
  return (
    <div className="lyrics-chord-line">
      {line.tokens.map((token, i) => (
        <span key={i} className="chord-pair">
          <span className="chord-label" style={{ fontSize: fontSize * 0.85 }}>
            {token.chord || "\u00A0"}
          </span>
          <span className="chord-text" style={{ fontSize }}>
            {token.text || (token.chord ? "\u00A0\u00A0" : "")}
          </span>
        </span>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────────
const SongView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const contentRef = useRef<HTMLIonContentElement>(null);
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [song, setSong] = useState<Song | null>(null);
  const [semitoneShift, setSemitoneShift] = useState(0);
  const [useFlats, setUseFlats] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [darkMode, setDarkMode] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [transposeVisible, setTransposeVisible] = useState(true);

  // Swipe-up gesture on the collapsed handle
  const swipeTouchStartY = useRef<number | null>(null);
  const handleSwipeTouchStart = (e: React.TouchEvent) => {
    swipeTouchStartY.current = e.touches[0].clientY;
  };
  const handleSwipeTouchEnd = (e: React.TouchEvent) => {
    if (swipeTouchStartY.current === null) return;
    const delta = swipeTouchStartY.current - e.changedTouches[0].clientY;
    if (delta > 30) setTransposeVisible(true); // swipe up
    swipeTouchStartY.current = null;
  };

  // Load song
  useEffect(() => {
    const load = async () => {
      const s = await getSongById(id);
      if (s) {
        setSong(s);
        const origKey = detectKey(s.lyrics);
        const origSemitone = keyToSemitone(origKey);
        setUseFlats(autoFlats(origSemitone));
      } else {
        history.replace("/home");
      }
    };
    load();
  }, [id, history]);

  // Reload when returning from editor
  useEffect(() => {
    const unlisten = history.listen(async () => {
      const s = await getSongById(id);
      if (s) setSong(s);
    });
    return unlisten;
  }, [id, history]);

  // Auto scroll effect
  useEffect(() => {
    if (autoScroll && contentRef.current) {
      scrollIntervalRef.current = setInterval(async () => {
        const content = contentRef.current;
        if (content) {
          const scrollEl = await content.getScrollElement();
          scrollEl.scrollTop += 1;
        }
      }, 50);
    } else if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [autoScroll]);

  const originalKey = useMemo(
    () => (song ? detectKey(song.lyrics) : "C"),
    [song],
  );

  const currentSemitone = useMemo(
    () => (((keyToSemitone(originalKey) + semitoneShift) % 12) + 12) % 12,
    [originalKey, semitoneShift],
  );

  // Get the current key name based on semitone
  const getCurrentKeyName = (): string => {
    const keyMap: Record<number, string> = {
      0: "C",
      1: useFlats ? "Db" : "C#",
      2: "D",
      3: useFlats ? "Eb" : "D#",
      4: "E",
      5: "F",
      6: useFlats ? "Gb" : "F#",
      7: "G",
      8: useFlats ? "Ab" : "G#",
      9: "A",
      10: useFlats ? "Bb" : "A#",
      11: "B",
    };
    return keyMap[currentSemitone] || "C";
  };

  const currentKeyName = getCurrentKeyName();

  const transposedLyrics = useMemo(() => {
    if (!song) return "";
    return transposeLyrics(song.lyrics, semitoneShift, useFlats);
  }, [song, semitoneShift, useFlats]);

  const parsedLines = useMemo(
    () => parseLyrics(transposedLyrics),
    [transposedLyrics],
  );

  const sectionMarkers = useMemo(() => {
    const markers: { id: string; label: string }[] = [];
    parsedLines.forEach((line, index) => {
      const label = getSectionLabelFromLine(line);
      if (!label) return;
      markers.push({ id: `section-${index}`, label });
    });
    return markers;
  }, [parsedLines]);

  const scrollToSection = async (targetId: string) => {
    const content = contentRef.current;
    if (!content) return;
    const scrollEl = await content.getScrollElement();
    const target = document.getElementById(targetId);
    if (!scrollEl || !target) return;
    const top =
      scrollEl.scrollTop +
      target.getBoundingClientRect().top -
      scrollEl.getBoundingClientRect().top -
      12;
    content.scrollToPoint(0, Math.max(0, top), 300);
  };

  const shift = (delta: number) => {
    const newShift = semitoneShift + delta;
    const newSemitone =
      (((keyToSemitone(originalKey) + newShift) % 12) + 12) % 12;
    setUseFlats(autoFlats(newSemitone));
    setSemitoneShift(newShift);
  };

  const handleKeySelect = (targetKey: string) => {
    const diff = semitoneDiff(originalKey, targetKey);
    const targetSemitone = keyToSemitone(targetKey);
    setUseFlats(autoFlats(targetSemitone));
    setSemitoneShift(diff);
  };

  // Check if a key button matches current key
  const isKeyActive = (key: string): boolean => {
    // Handle enharmonic equivalents
    const equivalents: Record<string, string[]> = {
      "C#": ["C#", "Db"],
      Db: ["C#", "Db"],
      "D#": ["D#", "Eb"],
      Eb: ["D#", "Eb"],
      "F#": ["F#", "Gb"],
      Gb: ["F#", "Gb"],
      "G#": ["G#", "Ab"],
      Ab: ["G#", "Ab"],
      "A#": ["A#", "Bb"],
      Bb: ["A#", "Bb"],
    };
    const matches = equivalents[key] || [key];
    return matches.includes(currentKeyName);
  };

  if (!song)
    return (
      <IonPage>
        <IonContent />
      </IonPage>
    );

  return (
    <IonPage
      className={`song-view-page ${darkMode ? "dark-mode" : "light-mode"}`}
    >
      <IonHeader className="song-view-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" text="" />
          </IonButtons>
          <IonTitle className="song-view-title">{song.title}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={() => setDarkMode(!darkMode)}
              className="theme-toggle-btn"
            >
              <IonIcon
                slot="icon-only"
                icon={darkMode ? sunnyOutline : moonOutline}
              />
            </IonButton>
            <IonButton onClick={() => history.push(`/editor/${song.id}`)}>
              <IonIcon slot="icon-only" icon={createOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      {/* Transpose Controls */}
      <div
        className={`transpose-controls-wrapper ${transposeVisible ? "expanded" : "collapsed"}`}
      >
        {/* Collapsed handle — sits at top, visible when panel is hidden */}
        <div
          className="transpose-handle"
          onTouchStart={handleSwipeTouchStart}
          onTouchEnd={handleSwipeTouchEnd}
          onClick={() => setTransposeVisible(true)}
          title="Swipe up or tap to show transpose"
        >
          <span className="handle-key-hint">KEY&nbsp;{currentKeyName}</span>
          <IonIcon icon={chevronDownOutline} className="handle-chevron" />
        </div>
        <div className="transpose-controls">
          <div className="transpose-top-row">
            <div className="current-key-display">
              <span className="current-key-label">Key</span>
              <span className="current-key-value">{currentKeyName}</span>
              {semitoneShift !== 0 && (
                <span className="semitone-shift">
                  {semitoneShift > 0 ? "+" : ""}
                  {semitoneShift}
                </span>
              )}
            </div>
            <div className="transpose-step-btns">
              <button className="step-btn minus" onClick={() => shift(-1)}>
                <IonIcon icon={removeOutline} />
              </button>
              <button className="step-btn plus" onClick={() => shift(1)}>
                <IonIcon icon={addOutline} />
              </button>
              <button
                className="step-btn collapse-btn"
                onClick={() => setTransposeVisible(false)}
                title="Hide transpose panel"
              >
                <IonIcon icon={chevronUpOutline} />
              </button>
            </div>
          </div>
          <div className="keys-grid">
            {ALL_KEYS.map((key) => (
              <button
                key={key}
                className={`key-btn ${isKeyActive(key) ? "active" : ""}`}
                onClick={() => handleKeySelect(key)}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>

      <IonContent ref={contentRef} className="song-view-content">
        {song.artist && <div className="song-artist">{song.artist}</div>}

        {sectionMarkers.length > 0 && (
          <div className="section-nav">
            {sectionMarkers.map((marker) => (
              <button
                key={marker.id}
                className="section-nav-btn"
                onClick={() => scrollToSection(marker.id)}
              >
                {marker.label}
              </button>
            ))}
          </div>
        )}

        <div className="lyrics-container" style={{ fontSize }}>
          {parsedLines.map((line, i) => {
            const sectionLabel = getSectionLabelFromLine(line);
            const sectionId = sectionLabel ? `section-${i}` : undefined;
            return (
              <div key={i} id={sectionId}>
                <LyricsLine line={line} fontSize={fontSize} />
              </div>
            );
          })}
        </div>

        <div style={{ height: 100 }} />
      </IonContent>

      {/* Bottom Toolbar */}
      <IonFooter className="bottom-bar">
        <div className="bottom-bar-inner">
          <button
            className={`bar-btn ${autoScroll ? "active" : ""}`}
            onClick={() => setAutoScroll(!autoScroll)}
          >
            <IonIcon icon={autoScroll ? pauseOutline : playOutline} />
            <span>Scroll</span>
          </button>
          <button
            className="bar-btn"
            onClick={() => setFontSize((f) => Math.max(12, f - 2))}
          >
            <span className="font-icon small">A</span>
          </button>
          <button
            className="bar-btn"
            onClick={() => setFontSize((f) => Math.min(28, f + 2))}
          >
            <span className="font-icon large">A</span>
          </button>
          <button className="bar-btn" onClick={() => shift(-1)}>
            <IonIcon icon={removeOutline} />
          </button>
          <button className="bar-btn" onClick={() => shift(1)}>
            <IonIcon icon={addOutline} />
          </button>
        </div>
      </IonFooter>

      <IonToast
        isOpen={showToast}
        message="Copied to clipboard!"
        duration={2000}
        onDidDismiss={() => setShowToast(false)}
      />
    </IonPage>
  );
};

export default SongView;
