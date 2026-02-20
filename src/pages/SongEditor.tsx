import React, { useEffect, useRef, useState } from "react";
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
  IonTextarea,
  IonCard,
  IonCardContent,
  IonIcon,
  IonText,
  IonToast,
  IonBackButton,
} from "@ionic/react";
import { save, informationCircleOutline } from "ionicons/icons";
import { useHistory, useParams } from "react-router-dom";
import { getSongById, saveSong, createSong } from "../utils/storage";
import "./SongEditor.css";

const EXAMPLE = `[Am]Yesterday, [G]all my [C]troubles seemed so [F]far away
[C]Now it [G]looks as though they're [Am]here to [F]stay
[Dm]Oh I be[G]lieve in [C]yesterday`;

const SongEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const isNew = id === "new";

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    if (!isNew) {
      const song = getSongById(id);
      if (song) {
        setTitle(song.title);
        setArtist(song.artist);
        setLyrics(song.lyrics);
      } else {
        history.replace("/home");
      }
    }
  }, [id, isNew, history]);

  const handleSave = () => {
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

    if (isNew) {
      const newSong = createSong(title, artist, lyrics);
      saveSong(newSong);
      history.replace(`/song/${newSong.id}`);
    } else {
      const existing = getSongById(id)!;
      saveSong({
        ...existing,
        title: title.trim() || "Untitled Song",
        artist: artist.trim(),
        lyrics,
        updatedAt: Date.now(),
      });
      history.goBack();
    }
  };

  const insertExample = () => {
    if (!lyrics.trim()) setLyrics(EXAMPLE);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" text="Back" />
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
              placeholder="e.g. Yesterday"
              clearInput
            />
          </IonItem>
          <IonItem className="editor-item">
            <IonLabel position="stacked">Artist</IonLabel>
            <IonInput
              value={artist}
              onIonInput={(e) => setArtist(e.detail.value ?? "")}
              placeholder="e.g. The Beatles"
              clearInput
            />
          </IonItem>
        </div>

        {/* Chord format guide */}
        <IonCard className="guide-card">
          <IonCardContent>
            <div className="guide-header">
              <IonIcon icon={informationCircleOutline} color="primary" />
              <IonText color="primary">
                <strong>Chord Notation Guide</strong>
              </IonText>
            </div>
            <p className="guide-text">
              Place chords inline using <code>[ChordName]</code> before the
              syllable they belong to.
            </p>
            <div className="guide-example">
              <span className="guide-raw">
                [Am]Hello [G]world, [C]here I [F]am
              </span>
            </div>
            <p className="guide-text guide-hint">
              Supported: <code>Am</code> <code>C#</code> <code>Bb7</code>{" "}
              <code>Fmaj7</code> <code>G/B</code> <code>Dsus4</code> — and all
              standard chord notations.
            </p>
            {!lyrics.trim() && (
              <IonButton fill="clear" size="small" onClick={insertExample}>
                Load example lyrics
              </IonButton>
            )}
          </IonCardContent>
        </IonCard>

        {/* Lyrics editor */}
        <div className="editor-section">
          <IonItem className="editor-item lyrics-item" lines="none">
            <IonLabel position="stacked">Lyrics with Chords *</IonLabel>
            <IonTextarea
              value={lyrics}
              onIonInput={(e) => setLyrics(e.detail.value ?? "")}
              placeholder={"[Am]Hello [G]world\n[C]Enter your lyrics here..."}
              autoGrow
              rows={12}
              className="lyrics-textarea"
              spellcheck={false}
              wrap="soft"
            />
          </IonItem>
        </div>

        <div className="save-btn-wrap">
          <IonButton
            expand="block"
            onClick={handleSave}
            size="large"
            color="primary"
          >
            <IonIcon slot="start" icon={save} />
            {isNew ? "Save Song" : "Update Song"}
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
