import React, { useEffect, useState, useCallback } from "react";
import {
  IonPage,
  IonHeader,
  IonFooter,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonInput,
  IonIcon,
  IonToast,
  IonBackButton,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";
import {
  save,
  micOutline,
  textOutline,
  chevronDownOutline,
  checkmarkOutline,
} from "ionicons/icons";
import { useHistory, useParams } from "react-router-dom";
import { getSongById, saveSong, createSong } from "../utils/firebaseStorage";
import { SongCategory } from "../types";
import VisualChordEditor, {
  detectKey,
  transposeText,
  ALL_KEYS,
} from "../components/VisualChordEditor";
import "./SongEditor.css";

const SongEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const isNew = id === "new";

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [category, setCategory] = useState<SongCategory>("praise");
  const [lyrics, setLyrics] = useState("");
  const [currentKey, setCurrentKey] = useState("C");
  const [originalKey, setOriginalKey] = useState("C");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      const loadSong = async () => {
        const song = await getSongById(id);
        if (song) {
          setTitle(song.title);
          setArtist(song.artist);
          setCategory(song.category || "other");
          setLyrics(song.lyrics);
          const detected = detectKey(song.lyrics);
          setCurrentKey(detected);
          setOriginalKey(detected);
        } else {
          history.replace("/home");
        }
      };
      loadSong();
    }
  }, [id, isNew, history]);

  // Handle key detected from chord editor
  const handleKeyDetected = useCallback((detected: string) => {
    setCurrentKey(detected);
    setOriginalKey(detected);
  }, []);

  // Handle key change (transpose)
  const handleKeyChange = useCallback(
    (newKey: string) => {
      if (newKey !== currentKey && lyrics.trim()) {
        const transposed = transposeText(lyrics, currentKey, newKey);
        setLyrics(transposed);
        setCurrentKey(newKey);
      }
    },
    [currentKey, lyrics],
  );

  const handleSave = async () => {
    if (!title.trim()) {
      setToastMsg("Please enter a song title.");
      setShowToast(true);
      return;
    }
    if (!lyrics.trim()) {
      setToastMsg("Please enter some lyrics.");
      setShowToast(true);
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const newSong = createSong(title, artist, lyrics, category);
        await saveSong(newSong);
        history.replace(`/song/${newSong.id}`);
      } else {
        const existing = await getSongById(id);
        if (!existing) throw new Error("Song not found");
        await saveSong({
          ...existing,
          title: title.trim() || "Untitled Song",
          artist: artist.trim(),
          category,
          lyrics,
          updatedAt: Date.now(),
        });
        history.goBack();
      }
    } catch (err) {
      setToastMsg("Failed to save. Check your connection.");
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary" className="editor-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" text="" color="light" />
          </IonButtons>
          <IonTitle className="editor-header-title">
            {isNew ? "New Song" : "Edit Song"}
          </IonTitle>
          <IonButtons slot="end">
            <button className="save-pill-btn" onClick={handleSave}>
              <IonIcon icon={save} />
              <span>SAVE</span>
            </button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="editor-content">
        {/* ── Song Title & Artist card ── */}
        <div className="editor-card">
          <div className="field-group">
            <label className="field-label">SONG TITLE *</label>
            <div className="field-input-wrap">
              <IonInput
                className="field-input"
                value={title}
                onIonInput={(e) => setTitle(e.detail.value ?? "")}
                placeholder="e.g. How Great Is Our God"
              />
              <IonIcon icon={textOutline} className="field-icon" />
            </div>
          </div>

          <div className="field-divider" />

          <div className="field-group">
            <label className="field-label">ARTIST</label>
            <div className="field-input-wrap">
              <IonInput
                className="field-input"
                value={artist}
                onIonInput={(e) => setArtist(e.detail.value ?? "")}
                placeholder="e.g. Chris Tomlin"
              />
              <IonIcon icon={micOutline} className="field-icon" />
            </div>
          </div>
        </div>

        {/* ── Category card ── */}
        <div className="editor-card">
          <label className="field-label">CATEGORY *</label>
          <div className="category-pills">
            {(["praise", "worship", "other"] as SongCategory[]).map((cat) => (
              <button
                key={cat}
                className={`cat-pill ${
                  category === cat ? "cat-pill--active" : ""
                }`}
                onClick={() => setCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Lyrics & Chords card ── */}
        <div className="editor-card chord-card">
          <div className="chord-card-header">
            <div className="chord-card-titles">
              <span className="chord-card-title">LYRICS &amp; CHORDS</span>
              <span className="chord-card-subtitle">
                Auto-formatting enabled
              </span>
            </div>
            <div className="key-pill">
              <span className="key-pill-label">KEY</span>
              <IonSelect
                value={currentKey}
                onIonChange={(e) => handleKeyChange(e.detail.value)}
                interface="popover"
                className="key-pill-select"
              >
                {ALL_KEYS.map((k) => (
                  <IonSelectOption key={k} value={k}>
                    {k}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </div>
          </div>

          <VisualChordEditor
            value={lyrics}
            onChange={setLyrics}
            onKeyDetected={handleKeyDetected}
          />
        </div>

        <div style={{ height: 24 }} />
      </IonContent>

      {/* ── Sticky footer CTA ── */}
      <IonFooter className="editor-footer">
        <button className="complete-btn" onClick={handleSave} disabled={saving}>
          <IonIcon icon={checkmarkOutline} />
          <span>{saving ? "Saving…" : "Complete Song"}</span>
        </button>
      </IonFooter>

      <IonToast
        isOpen={showToast}
        message={toastMsg}
        duration={2500}
        color="warning"
        onDidDismiss={() => setShowToast(false)}
      />
    </IonPage>
  );
};

export default SongEditor;
