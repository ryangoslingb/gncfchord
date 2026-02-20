import React, { useEffect, useState, useMemo } from "react";
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
  IonButtons,
  IonButton,
  IonListHeader,
  useIonViewWillEnter,
} from "@ionic/react";
import {
  add,
  musicalNotes,
  trash,
  listOutline,
  pricetagOutline,
  logOutOutline,
} from "ionicons/icons";
import { useHistory } from "react-router-dom";
import { getAllSongs, deleteSong } from "../utils/firebaseStorage";
import { useAuth } from "../contexts/AuthContext";
import { Song, SongCategory } from "../types";
import "./Home.css";

const Home: React.FC = () => {
  const history = useHistory();
  const { logout } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [logoutAlert, setLogoutAlert] = useState(false);

  const handleLogout = async () => {
    await logout();
    // PrivateRoute automatically redirects to /login when currentUser becomes null
  };

  const loadSongs = async () => {
    try {
      const all = await getAllSongs();
      setSongs(all);
    } catch {
      setSongs([]);
    }
  };

  useEffect(() => {
    loadSongs();
  }, []);

  useIonViewWillEnter(() => {
    loadSongs();
  });

  const handleDelete = async (id: string) => {
    await deleteSong(id);
    loadSongs();
    setDeleteId(null);
  };

  // Group songs by category
  const categorizedSongs = useMemo(() => {
    const praise = songs.filter((s) => s.category === "praise");
    const worship = songs.filter((s) => s.category === "worship");
    const other = songs.filter((s) => !s.category || s.category === "other");
    return { praise, worship, other };
  }, [songs]);

  const renderSongItem = (song: Song) => (
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
          {song.artist && <p className="song-artist-text">{song.artist}</p>}
        </IonLabel>
        <IonNote slot="end" className="song-date">
          {new Date(song.updatedAt).toLocaleDateString()}
        </IonNote>
      </IonItem>
      <IonItemOptions side="end">
        <IonItemOption color="danger" onClick={() => setDeleteId(song.id)}>
          <IonIcon slot="icon-only" icon={trash} />
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle className="home-title">
            <IonIcon icon={musicalNotes} className="title-icon" /> GNCFMusicTeam
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push("/setlists")}>
              <IonIcon slot="icon-only" icon={listOutline} />
            </IonButton>
            <IonButton onClick={() => setLogoutAlert(true)}>
              <IonIcon slot="icon-only" icon={logOutOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="home-content">
        {/* Quick access to Set Lists */}
        <div className="setlist-quick-access">
          <IonItem
            button
            detail
            onClick={() => history.push("/setlists")}
            className="setlist-access-item"
          >
            <IonIcon icon={listOutline} slot="start" color="secondary" />
            <IonLabel>
              <h2>Set Lists</h2>
              <p>Create service lineups</p>
            </IonLabel>
          </IonItem>
        </div>

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
          <>
            {/* Praise Songs */}
            {categorizedSongs.praise.length > 0 && (
              <IonList lines="full" className="song-list category-list">
                <IonListHeader className="category-header praise">
                  <IonLabel>
                    <IonIcon icon={pricetagOutline} /> Praise
                  </IonLabel>
                  <IonNote>{categorizedSongs.praise.length} songs</IonNote>
                </IonListHeader>
                {categorizedSongs.praise.map(renderSongItem)}
              </IonList>
            )}

            {/* Worship Songs */}
            {categorizedSongs.worship.length > 0 && (
              <IonList lines="full" className="song-list category-list">
                <IonListHeader className="category-header worship">
                  <IonLabel>
                    <IonIcon icon={pricetagOutline} /> Worship
                  </IonLabel>
                  <IonNote>{categorizedSongs.worship.length} songs</IonNote>
                </IonListHeader>
                {categorizedSongs.worship.map(renderSongItem)}
              </IonList>
            )}

            {/* Other Songs */}
            {categorizedSongs.other.length > 0 && (
              <IonList lines="full" className="song-list category-list">
                <IonListHeader className="category-header other">
                  <IonLabel>
                    <IonIcon icon={pricetagOutline} /> Other
                  </IonLabel>
                  <IonNote>{categorizedSongs.other.length} songs</IonNote>
                </IonListHeader>
                {categorizedSongs.other.map(renderSongItem)}
              </IonList>
            )}
          </>
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
        isOpen={logoutAlert}
        header="Sign Out"
        message="Are you sure you want to sign out?"
        buttons={[
          {
            text: "Cancel",
            role: "cancel",
            handler: () => setLogoutAlert(false),
          },
          { text: "Sign Out", role: "destructive", handler: handleLogout },
        ]}
        onDidDismiss={() => setLogoutAlert(false)}
      />

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
