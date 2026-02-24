import React, { useEffect, useState, useMemo } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonFab,
  IonFabButton,
  IonIcon,
  IonAlert,
  IonButtons,
  IonButton,
  IonSegment,
  IonSegmentButton,
  IonSearchbar,
  IonActionSheet,
  useIonViewWillEnter,
} from "@ionic/react";
import {
  add,
  musicalNotes,
  trash,
  listOutline,
  calendarOutline,
  logOutOutline,
  ellipsisVertical,
  createOutline,
  eyeOutline,
  addCircleOutline,
} from "ionicons/icons";
import { useHistory } from "react-router-dom";
import { getAllSongs, deleteSong } from "../utils/firebaseStorage";
import { useAuth } from "../contexts/AuthContext";
import { Song, SongCategory } from "../types";
import "./Home.css";

// Extract the first chord from lyrics as the musical key
const extractKey = (song: Song): string | null => {
  if (song.key) return song.key;
  const match = song.lyrics.match(
    /\[([A-G][#b]?(?:m|maj|min|sus|aug|dim|add)?[0-9]*(?:\/[A-G][#b]?)?)\]/,
  );
  return match ? match[1] : null;
};

const Home: React.FC = () => {
  const history = useHistory();
  const { logout, currentUser } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [logoutAlert, setLogoutAlert] = useState(false);
  const [activeTab, setActiveTab] = useState<SongCategory>("praise");
  const [actionSong, setActionSong] = useState<Song | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const getFirstName = (): string => {
    if (currentUser?.displayName) return currentUser.displayName.split(" ")[0];
    return currentUser?.email?.split("@")[0] || "there";
  };

  const getInitial = (): string => getFirstName().charAt(0).toUpperCase();

  const getDayDate = (): string =>
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

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

  const handleLogout = async () => {
    await logout();
  };

  const categorizedSongs = useMemo(() => {
    const praise = songs.filter((s) => s.category === "praise");
    const worship = songs.filter((s) => s.category === "worship");
    const other = songs.filter((s) => !s.category || s.category === "other");
    return { praise, worship, other };
  }, [songs]);

  const activeSongsRaw: Song[] = categorizedSongs[activeTab] ?? [];
  const activeSongs: Song[] = searchQuery.trim()
    ? activeSongsRaw.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.artist || "").toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : activeSongsRaw;

  const renderSongItem = (song: Song) => {
    const key = extractKey(song);
    return (
      <IonItem
        key={song.id}
        button
        detail={false}
        onClick={() => history.push(`/song/${song.id}`)}
        className="song-item"
        lines="full"
      >
        {/* Thumbnail */}
        <div className="song-thumb" slot="start">
          <IonIcon icon={musicalNotes} className="thumb-icon" />
        </div>

        <IonLabel>
          <h2 className="song-title-text">{song.title}</h2>
          <p className="song-meta-text">
            <span className="song-artist-span">{song.artist || "Unknown"}</span>
            {key && (
              <>
                <span className="meta-dot"> • </span>
                <span className="key-chip">{key}</span>
              </>
            )}
          </p>
        </IonLabel>

        <IonButton
          fill="clear"
          slot="end"
          className="song-more-btn"
          onClick={(e) => {
            e.stopPropagation();
            setActionSong(song);
          }}
        >
          <IonIcon icon={ellipsisVertical} />
        </IonButton>
      </IonItem>
    );
  };

  return (
    <IonPage>
      <IonHeader className="home-header" collapse="fade">
        <IonToolbar className="home-toolbar">
          {/* Logo */}
          <div slot="start" className="home-logo">
            <div className="logo-icon-wrap">
              <IonIcon icon={musicalNotes} className="logo-note" />
            </div>
            <span className="logo-text">GncfMusic</span>
          </div>

          {/* Avatar / logout */}
          <IonButtons slot="end">
            <button className="avatar-btn" onClick={() => setLogoutAlert(true)}>
              {getInitial()}
            </button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="home-content">
        {/* ── Welcome ── */}
        <div className="welcome-section">
          <p className="welcome-date">{getDayDate()}</p>
          <h1 className="welcome-heading">Welcome, {getFirstName()}</h1>
        </div>

        {/* ── Action cards ── */}
        <div className="action-cards">
          <div
            className="action-card card-yellow"
            onClick={() => history.push("/editor/new")}
          >
            <IonIcon icon={addCircleOutline} className="card-icon" />
            <span className="card-label">
              Create
              <br />
              Song
            </span>
          </div>
          <div
            className="action-card card-purple"
            onClick={() => history.push("/setlists")}
          >
            <IonIcon icon={calendarOutline} className="card-icon" />
            <span className="card-label">
              Scheduled
              <br />
              Lineup
            </span>
          </div>
        </div>

        {/* ── Search bar ── */}
        <div className="home-search-wrap">
          <IonSearchbar
            className="home-searchbar"
            placeholder="Search songs or artists…"
            value={searchQuery}
            onIonInput={(e) => setSearchQuery(e.detail.value ?? "")}
            onIonClear={() => setSearchQuery("")}
            debounce={150}
          />
        </div>

        {/* ── Category tabs ── */}
        <IonSegment
          className="home-tabs"
          value={activeTab}
          onIonChange={(e) => setActiveTab(e.detail.value as SongCategory)}
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

        {/* ── Song list ── */}
        {songs.length === 0 ? (
          <div className="empty-state">
            <IonIcon icon={musicalNotes} className="empty-icon" />
            <p className="empty-title">No songs yet</p>
            <p className="empty-sub">
              Tap <strong>+</strong> to add your first song.
            </p>
          </div>
        ) : activeSongs.length === 0 ? (
          <div className="empty-tab-state">
            <p>No {activeTab} songs yet</p>
          </div>
        ) : (
          <IonList className="song-list" lines="full">
            {activeSongs.map(renderSongItem)}
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

      {/* Three-dot action sheet */}
      <IonActionSheet
        isOpen={actionSong !== null}
        header={actionSong?.title}
        buttons={[
          {
            text: "View Song",
            icon: eyeOutline,
            handler: () => {
              history.push(`/song/${actionSong?.id}`);
            },
          },
          {
            text: "Edit Song",
            icon: createOutline,
            handler: () => {
              history.push(`/editor/${actionSong?.id}`);
            },
          },
          {
            text: "Delete",
            icon: trash,
            role: "destructive",
            handler: () => {
              if (actionSong) setDeleteId(actionSong.id);
            },
          },
          { text: "Cancel", role: "cancel" },
        ]}
        onDidDismiss={() => setActionSong(null)}
      />

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
