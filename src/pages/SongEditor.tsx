import React, { useEffect, useState, useCallback } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonIcon,
  IonToast,
  IonBackButton,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";
import { save } from "ionicons/icons";
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
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" text="" />
          </IonButtons>
          <IonTitle>{isNew ? "New Song" : "Edit Song"}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleSave} strong>
              <IonIcon slot="start" icon={save} />
              Save
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="editor-content">
        {/* Song info */}
        <div className="editor-section">
          <IonItem className="editor-item">
            <IonLabel position="stacked">Song Title *</IonLabel>
            <IonInput
              value={title}
              onIonInput={(e) => setTitle(e.detail.value ?? "")}
              placeholder="e.g. How Great Is Our God"
              clearInput
            />
          </IonItem>
          <IonItem className="editor-item">
            <IonLabel position="stacked">Artist</IonLabel>
            <IonInput
              value={artist}
              onIonInput={(e) => setArtist(e.detail.value ?? "")}
              placeholder="e.g. Chris Tomlin"
              clearInput
            />
          </IonItem>
        </div>

        {/* Category selector */}
        <div className="category-section">
          <IonLabel className="category-label">Category *</IonLabel>
          <IonSegment
            value={category}
            onIonChange={(e) => setCategory(e.detail.value as SongCategory)}
            className="category-segment"
          >
            <IonSegmentButton value="praise">
              <IonLabel>Praise</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="worship">
              <IonLabel>Worship</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="other">
              <IonLabel>Other</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </div>

        {/* Visual Chord Editor */}
        <div className="chord-editor-section">
          <div className="section-header">
            <IonLabel className="section-label">Lyrics with Chords *</IonLabel>
            <div className="key-selector">
              <span className="key-label">Key:</span>
              <IonSelect
                value={currentKey}
                onIonChange={(e) => handleKeyChange(e.detail.value)}
                interface="popover"
                className="key-select"
              >
                {ALL_KEYS.map((key) => (
                  <IonSelectOption key={key} value={key}>
                    {key}
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

        <div className="save-btn-wrap">
          <IonButton
            onClick={handleSave}
            size="large"
            color="primary"
            disabled={saving}
          >
            <IonIcon slot="start" icon={save} />
            {saving ? "Saving…" : isNew ? "Save Song" : "Update Song"}
          </IonButton>
        </div>
      </IonContent>

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
