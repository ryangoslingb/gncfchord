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
  IonFooter,
  IonToast,
} from "@ionic/react";
import {
  closeOutline,
  removeOutline,
  addOutline,
  sunnyOutline,
  moonOutline,
  playOutline,
  pauseOutline,
  textOutline,
  chevronBackOutline,
  chevronForwardOutline,
  listOutline,
  chevronUpOutline,
  chevronDownOutline,
} from "ionicons/icons";
import { useHistory, useParams, useLocation } from "react-router-dom";
import {
  transposeLyrics,
  detectKey,
  parseLyrics,
  ParsedLine,
  keyToSemitone,
} from "../utils/chordTransposer";
import { getSetListById, getAllSongs } from "../utils/firebaseStorage";
import { SetList, Song } from "../types";
import "./SetListPlay.css";

// All 12 chromatic keys
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
const FLAT_SEMITONES = new Set([1, 3, 5, 8, 10]);

function autoFlats(semitone: number): boolean {
  return FLAT_SEMITONES.has(((semitone % 12) + 12) % 12);
}

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

// Lyrics Line Component
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

interface PlaylistSong {
  song: Song;
  sectionName: string;
  indexInSection: number;
}

const SetListPlay: React.FC = () => {
  const { id, songIndex } = useParams<{ id: string; songIndex?: string }>();
  const history = useHistory();
  const location = useLocation();
  const contentRef = useRef<HTMLIonContentElement>(null);
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const [setList, setSetList] = useState<SetList | null>(null);
  const [songMap, setSongMap] = useState<Record<string, Song>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  // Per-song semitone shifts keyed by playlist index - persists across navigation
  const [songShifts, setSongShifts] = useState<Record<number, number>>({});
  const [useFlats, setUseFlats] = useState(false);

  // Helper: get shift for current song (default 0)
  const semitoneShift = songShifts[currentIndex] ?? 0;

  const setSemitoneShift = (shift: number) => {
    setSongShifts((prev) => ({ ...prev, [currentIndex]: shift }));
  };
  const [fontSize, setFontSize] = useState(18);
  const [darkMode, setDarkMode] = useState(true);
  const [autoScroll, setAutoScroll] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showSongList, setShowSongList] = useState(false);
  const [transposeVisible, setTransposeVisible] = useState(true);

  // Swipe-up on the collapsed handle to restore panel
  const transposeTouchStartY = useRef<number | null>(null);
  const handleTransposeTouchStart = (e: React.TouchEvent) => {
    transposeTouchStartY.current = e.touches[0].clientY;
  };
  const handleTransposeTouchEnd = (e: React.TouchEvent) => {
    if (transposeTouchStartY.current === null) return;
    const delta = transposeTouchStartY.current - e.changedTouches[0].clientY;
    if (delta > 30) setTransposeVisible(true);
    transposeTouchStartY.current = null;
  };

  // Build flat playlist from sections
  const playlist = useMemo((): PlaylistSong[] => {
    if (!setList) return [];
    const songs: PlaylistSong[] = [];

    setList.sections.forEach((section) => {
      section.songIds.forEach((songId, idx) => {
        const song = songMap[songId];
        if (song) {
          songs.push({
            song,
            sectionName: section.name,
            indexInSection: idx + 1,
          });
        }
      });
    });

    return songs;
  }, [setList, songMap]);

  const currentSong = playlist[currentIndex];

  // Load set list
  useEffect(() => {
    const load = async () => {
      const sl = await getSetListById(id);
      if (sl) {
        setSetList(sl);
      } else {
        history.replace("/setlists");
      }
    };
    load();

    // Load all songs into lookup map
    getAllSongs()
      .then((all) => {
        const map: Record<string, Song> = {};
        all.forEach((s) => {
          map[s.id] = s;
        });
        setSongMap(map);
      })
      .catch(() => {});
  }, [id, history]);

  // Set initial song index from URL
  useEffect(() => {
    if (songIndex !== undefined) {
      const idx = parseInt(songIndex, 10);
      if (!isNaN(idx) && idx >= 0) {
        setCurrentIndex(idx);
      }
    }
  }, [songIndex]);

  // When song changes, sync useFlats to the saved key (or original if not yet set)
  useEffect(() => {
    if (currentSong) {
      const origKey = detectKey(currentSong.song.lyrics);
      const savedShift = songShifts[currentIndex] ?? 0;
      const effectiveSemitone =
        (((keyToSemitone(origKey) + savedShift) % 12) + 12) % 12;
      setUseFlats(autoFlats(effectiveSemitone));

      // Scroll to top
      contentRef.current?.scrollToTop(300);
    }
  }, [currentIndex, currentSong]);

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

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 80;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < playlist.length - 1) {
        // Swipe left - next song
        goToNext();
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right - previous song
        goToPrev();
      }
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const goToNext = () => {
    if (currentIndex < playlist.length - 1) {
      setAutoScroll(false);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setAutoScroll(false);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToSong = (index: number) => {
    setAutoScroll(false);
    setCurrentIndex(index);
    setShowSongList(false);
  };

  // Key calculations
  const originalKey = useMemo(
    () => (currentSong ? detectKey(currentSong.song.lyrics) : "C"),
    [currentSong],
  );

  const currentSemitone = useMemo(
    () => (((keyToSemitone(originalKey) + semitoneShift) % 12) + 12) % 12,
    [originalKey, semitoneShift],
  );

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

  const transposedLyrics = useMemo(() => {
    if (!currentSong) return "";
    return transposeLyrics(currentSong.song.lyrics, semitoneShift, useFlats);
  }, [currentSong, semitoneShift, useFlats]);

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

  const handleTranspose = (delta: number) => {
    const newShift = semitoneShift + delta;
    const newSemitone =
      (((keyToSemitone(originalKey) + newShift) % 12) + 12) % 12;
    setUseFlats(autoFlats(newSemitone));
    setSemitoneShift(newShift);
  };

  const handleKeySelect = (key: string) => {
    const targetSemitone = keyToSemitone(key);
    const currentOrigSemitone = keyToSemitone(originalKey);
    const newShift = targetSemitone - currentOrigSemitone;
    setSemitoneShift(newShift);
    setUseFlats(autoFlats(targetSemitone));
  };

  // Check if a key button matches current key
  const isKeyActive = (key: string): boolean => {
    const currentKeyName = getCurrentKeyName();
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

  if (!setList || !currentSong) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <p>Loading...</p>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage
      className={`setlist-play-page ${darkMode ? "dark-mode" : "light-mode"}`}
    >
      <IonHeader className="song-view-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon slot="icon-only" icon={closeOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle className="song-view-title">
            {currentSong.song.title}
          </IonTitle>
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
            <IonButton onClick={() => setShowSongList(true)}>
              <IonIcon slot="icon-only" icon={listOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      {/* Transpose Controls - collapsible */}
      <div
        className={`transpose-controls-wrapper ${transposeVisible ? "expanded" : "collapsed"}`}
      >
        {/* Handle - visible when panel is hidden */}
        <div
          className="transpose-handle"
          onTouchStart={handleTransposeTouchStart}
          onTouchEnd={handleTransposeTouchEnd}
          onClick={() => setTransposeVisible(true)}
          title="Swipe up or tap to show transpose"
        >
          <span className="handle-key-hint">
            KEY&nbsp;{getCurrentKeyName()}
          </span>
          <IonIcon icon={chevronDownOutline} className="handle-chevron" />
        </div>
        <div className="transpose-controls">
          <div className="transpose-top-row">
            <div className="current-key-display">
              <span className="current-key-label">Key</span>
              <span className="current-key-value">{getCurrentKeyName()}</span>
              {semitoneShift !== 0 && (
                <span className="semitone-shift">
                  {semitoneShift > 0 ? "+" : ""}
                  {semitoneShift}
                </span>
              )}
            </div>
            <div className="transpose-step-btns">
              <button
                className="step-btn minus"
                onClick={() => handleTranspose(-1)}
              >
                <IonIcon icon={removeOutline} />
              </button>
              <button
                className="step-btn plus"
                onClick={() => handleTranspose(1)}
              >
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

      <IonContent
        ref={contentRef}
        className="song-view-content"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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

        {/* Lyrics */}
        <div className="lyrics-container" style={{ fontSize }}>
          {parsedLines.map((line, idx) => {
            const sectionLabel = getSectionLabelFromLine(line);
            const sectionId = sectionLabel ? `section-${idx}` : undefined;
            return (
              <div key={idx} id={sectionId}>
                <LyricsLine line={line} fontSize={fontSize} />
              </div>
            );
          })}
        </div>

        {/* Swipe hint */}
        <div className="swipe-hint">
          {currentIndex > 0 && (
            <span className="hint-left">
              ← {playlist[currentIndex - 1]?.song.title}
            </span>
          )}
          {currentIndex < playlist.length - 1 && (
            <span className="hint-right">
              {playlist[currentIndex + 1]?.song.title} →
            </span>
          )}
        </div>

        <div style={{ height: 100 }} />
      </IonContent>

      {/* Bottom Toolbar - matching SongView */}
      <IonFooter className="bottom-bar">
        <div className="bottom-bar-inner">
          {/* Prev button */}
          <button
            className={`bar-btn nav-arrow ${currentIndex === 0 ? "disabled" : ""}`}
            onClick={goToPrev}
            disabled={currentIndex === 0}
          >
            <IonIcon icon={chevronBackOutline} />
          </button>

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
          <button className="bar-btn" onClick={() => handleTranspose(-1)}>
            <IonIcon icon={removeOutline} />
          </button>
          <button className="bar-btn" onClick={() => handleTranspose(1)}>
            <IonIcon icon={addOutline} />
          </button>

          {/* Next button */}
          <button
            className={`bar-btn nav-arrow ${currentIndex === playlist.length - 1 ? "disabled" : ""}`}
            onClick={goToNext}
            disabled={currentIndex === playlist.length - 1}
          >
            <IonIcon icon={chevronForwardOutline} />
          </button>
        </div>
      </IonFooter>

      {/* Song list overlay */}
      {showSongList && (
        <div
          className="song-list-overlay"
          onClick={() => setShowSongList(false)}
        >
          <div className="song-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{setList.name}</h2>
              <IonButton fill="clear" onClick={() => setShowSongList(false)}>
                <IonIcon slot="icon-only" icon={closeOutline} />
              </IonButton>
            </div>
            <div className="modal-content">
              {playlist.map((item, idx) => (
                <div
                  key={idx}
                  className={`playlist-item ${idx === currentIndex ? "active" : ""}`}
                  onClick={() => goToSong(idx)}
                >
                  <span className="item-number">{idx + 1}</span>
                  <div className="item-info">
                    <span className="item-title">{item.song.title}</span>
                    <span className="item-section">{item.sectionName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <IonToast
        isOpen={showToast}
        message="Copied to clipboard!"
        duration={1500}
        onDidDismiss={() => setShowToast(false)}
      />
    </IonPage>
  );
};

export default SetListPlay;
