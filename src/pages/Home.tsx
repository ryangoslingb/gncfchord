import React, { useEffect, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonFab,
  IonFabButton,
  IonIcon,
  IonText,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonAlert,
  IonNote,
} from "@ionic/react";
import { add, musicalNotes, trash } from "ionicons/icons";
import { useHistory } from "react-router-dom";
import { getAllSongs, deleteSong } from "../utils/storage";
import { Song } from "../types";
import "./Home.css";

const Home: React.FC = () => {
  const history = useHistory();
  const [songs, setSongs] = useState<Song[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadSongs = () => setSongs(getAllSongs());

  useEffect(() => {
    loadSongs();
    const unlisten = history.listen(loadSongs);
    return unlisten;
  }, [history]);

  const handleDelete = (id: string) => {
    deleteSong(id);
    loadSongs();
    setDeleteId(null);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle className="home-title">
            <IonIcon icon={musicalNotes} className="title-icon" /> ChordShift
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="home-content">
        {songs.length === 0 ? (
          <div className="empty-state">
            <IonIcon icon={musicalNotes} className="empty-icon" />
            <IonText color="medium">
              <h2>No songs yet</h2>
              <p>
                Tap <strong>+</strong> to add your first song with chords.
              </p>
            </IonText>
          </div>
        ) : (
          <IonList lines="full" className="song-list">
            {songs.map((song) => (
              <IonItemSliding key={song.id}>
                <IonItem
                  button
                  detail
                  onClick={() => history.push(`/song/${song.id}`)}
                  className="song-item"
                >
                  <IonIcon icon={musicalNotes} slot="start" color="primary" />
                  <IonLabel>
                    <h2 className="song-title-text">{song.title}</h2>
                    {song.artist && (
                      <p className="song-artist-text">{song.artist}</p>
                    )}
                  </IonLabel>
                  <IonNote slot="end" className="song-date">
                    {new Date(song.updatedAt).toLocaleDateString()}
                  </IonNote>
                </IonItem>
                <IonItemOptions side="end">
                  <IonItemOption
                    color="danger"
                    onClick={() => setDeleteId(song.id)}
                  >
                    <IonIcon slot="icon-only" icon={trash} />
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            ))}
          </IonList>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton
            onClick={() => history.push("/editor/new")}
            color="primary"
          >
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>

      <IonAlert
        isOpen={deleteId !== null}
        header="Delete Song"
        message="Are you sure you want to delete this song? This cannot be undone."
        buttons={[
          { text: "Cancel", role: "cancel", handler: () => setDeleteId(null) },
          {
            text: "Delete",
            role: "destructive",
            handler: () => {
              if (deleteId) handleDelete(deleteId);
            },
          },
        ]}
        onDidDismiss={() => setDeleteId(null)}
      />
    </IonPage>
  );
};

export default Home;
