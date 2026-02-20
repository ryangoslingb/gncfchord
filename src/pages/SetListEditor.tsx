import React, { useEffect, useState } from "react";
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
  IonList,
  IonReorderGroup,
  IonReorder,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonModal,
  IonSearchbar,
  IonCheckbox,
  IonChip,
  IonAlert,
} from "@ionic/react";
import {
  save,
  addOutline,
  musicalNotesOutline,
  trashOutline,
  reorderThreeOutline,
  closeOutline,
  checkmarkOutline,
} from "ionicons/icons";
import { useHistory, useParams } from "react-router-dom";
import {
  getSetListById,
  saveSetList,
  createSetList,
  createSetListSection,
  getAllSongs,
} from "../utils/firebaseStorage";
import { SetList, SetListSection, Song } from "../types";
import "./SetListEditor.css";

const SetListEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const isNew = id === "new";

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [sections, setSections] = useState<SetListSection[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [allSongs, setAllSongs] = useState<Song[]>([]);

  // Modal state for adding songs
  const [showSongModal, setShowSongModal] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);

  // Alert for adding new section
  const [showSectionAlert, setShowSectionAlert] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");

  useEffect(() => {
    const load = async () => {
      const all = await getAllSongs();
      setAllSongs(all);

      if (!isNew) {
        const setList = await getSetListById(id);
        if (setList) {
          setName(setList.name);
          setDate(setList.date);
          setSections(setList.sections);
        } else {
          history.replace("/setlists");
        }
      } else {
        // Default sections for new set list
        const now = Date.now();
        setSections([
          { id: `section_${now}_1`, name: "Praise", songIds: [] },
          { id: `section_${now}_2`, name: "Worship", songIds: [] },
        ]);
        // Default date to next Sunday
        const nextSunday = getNextSunday();
        setDate(nextSunday);
      }
    };
    load();
  }, [id, isNew, history]);

  const getNextSunday = (): string => {
    const today = new Date();
    const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    return nextSunday.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setToastMsg("Please enter a name for the set list.");
      setShowToast(true);
      return;
    }

    try {
      if (isNew) {
        const newSetList = createSetList(name, date);
        newSetList.sections = sections;
        await saveSetList(newSetList);
        history.replace(`/setlist/${newSetList.id}`);
      } else {
        const existing = await getSetListById(id);
        if (!existing) throw new Error("Set list not found");
        await saveSetList({
          ...existing,
          name: name.trim(),
          date,
          sections,
          updatedAt: Date.now(),
        });
        history.goBack();
      }
    } catch (err) {
      setToastMsg("Failed to save. Check your connection.");
      setShowToast(true);
    }
  };

  const addSection = () => {
    if (newSectionName.trim()) {
      const newSection = createSetListSection(newSectionName);
      setSections([...sections, newSection]);
      setNewSectionName("");
    }
    setShowSectionAlert(false);
  };

  const removeSection = (sectionId: string) => {
    setSections(sections.filter((s) => s.id !== sectionId));
  };

  const openSongPicker = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    setActiveSection(sectionId);
    setSelectedSongIds(section?.songIds || []);
    setSearchText("");
    setShowSongModal(true);
  };

  const toggleSongSelection = (songId: string) => {
    setSelectedSongIds((prev) =>
      prev.includes(songId)
        ? prev.filter((id) => id !== songId)
        : [...prev, songId],
    );
  };

  const confirmSongSelection = () => {
    if (activeSection) {
      setSections(
        sections.map((section) =>
          section.id === activeSection
            ? { ...section, songIds: selectedSongIds }
            : section,
        ),
      );
    }
    setShowSongModal(false);
    setActiveSection(null);
  };

  const removeSongFromSection = (sectionId: string, songId: string) => {
    setSections(
      sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              songIds: section.songIds.filter((id) => id !== songId),
            }
          : section,
      ),
    );
  };

  const handleReorder = (event: CustomEvent) => {
    const from = event.detail.from;
    const to = event.detail.to;
    const reordered = [...sections];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setSections(reordered);
    event.detail.complete();
  };

  const filteredSongs = allSongs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchText.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchText.toLowerCase()),
  );

  const getSongTitle = (songId: string): string => {
    const song = allSongs.find((s) => s.id === songId);
    return song?.title || "Unknown Song";
  };

  const getSongArtist = (songId: string): string => {
    const song = allSongs.find((s) => s.id === songId);
    return song?.artist || "";
  };

  return (
    <IonPage className="setlist-editor-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/setlists" text="" />
          </IonButtons>
          <IonTitle>{isNew ? "New Set List" : "Edit Set List"}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleSave} strong>
              <IonIcon slot="start" icon={save} />
              Save
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="setlist-editor-content">
        {/* Set List Info */}
        <div className="editor-section">
          <IonItem className="editor-item">
            <IonLabel position="stacked">Set List Name *</IonLabel>
            <IonInput
              value={name}
              onIonInput={(e) => setName(e.detail.value ?? "")}
              placeholder="e.g., This Sunday Service"
              clearInput
            />
          </IonItem>
          <IonItem className="editor-item">
            <IonLabel position="stacked">Date / Event</IonLabel>
            <IonInput
              value={date}
              onIonInput={(e) => setDate(e.detail.value ?? "")}
              placeholder="e.g., Sunday, March 15, 2026"
              clearInput
            />
          </IonItem>
        </div>

        {/* Sections */}
        <div className="sections-header">
          <h2>Lineup Sections</h2>
          <IonButton
            fill="clear"
            size="small"
            onClick={() => setShowSectionAlert(true)}
          >
            <IonIcon slot="start" icon={addOutline} />
            Add Section
          </IonButton>
        </div>

        <IonList className="sections-list">
          <IonReorderGroup disabled={false} onIonItemReorder={handleReorder}>
            {sections.map((section) => (
              <div key={section.id} className="section-card">
                <div className="section-header">
                  <IonReorder slot="start">
                    <IonIcon icon={reorderThreeOutline} />
                  </IonReorder>
                  <span className="section-name">{section.name}</span>
                  <div className="section-actions">
                    <IonButton
                      fill="clear"
                      size="small"
                      onClick={() => openSongPicker(section.id)}
                    >
                      <IonIcon slot="icon-only" icon={addOutline} />
                    </IonButton>
                    <IonButton
                      fill="clear"
                      size="small"
                      color="danger"
                      onClick={() => removeSection(section.id)}
                    >
                      <IonIcon slot="icon-only" icon={trashOutline} />
                    </IonButton>
                  </div>
                </div>

                {section.songIds.length === 0 ? (
                  <div className="empty-section">
                    <p>No songs yet. Tap + to add songs.</p>
                  </div>
                ) : (
                  <div className="section-songs">
                    {section.songIds.map((songId, index) => (
                      <div key={songId} className="song-chip">
                        <span className="song-number">{index + 1}.</span>
                        <div className="song-info">
                          <span className="song-title">
                            {getSongTitle(songId)}
                          </span>
                          {getSongArtist(songId) && (
                            <span className="song-artist">
                              {getSongArtist(songId)}
                            </span>
                          )}
                        </div>
                        <IonButton
                          fill="clear"
                          size="small"
                          onClick={() =>
                            removeSongFromSection(section.id, songId)
                          }
                        >
                          <IonIcon slot="icon-only" icon={closeOutline} />
                        </IonButton>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </IonReorderGroup>
        </IonList>

        {sections.length === 0 && (
          <div className="empty-sections">
            <p>No sections yet. Add a section to start building your lineup.</p>
          </div>
        )}

        <div className="save-btn-wrap">
          <IonButton
            expand="block"
            onClick={handleSave}
            size="large"
            color="primary"
          >
            <IonIcon slot="start" icon={save} />
            {isNew ? "Create Set List" : "Update Set List"}
          </IonButton>
        </div>
      </IonContent>

      {/* Song Picker Modal */}
      <IonModal
        isOpen={showSongModal}
        onDidDismiss={() => setShowSongModal(false)}
      >
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => setShowSongModal(false)}>
                Cancel
              </IonButton>
            </IonButtons>
            <IonTitle>Select Songs</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={confirmSongSelection} strong>
                <IonIcon slot="start" icon={checkmarkOutline} />
                Done
              </IonButton>
            </IonButtons>
          </IonToolbar>
          <IonToolbar>
            <IonSearchbar
              value={searchText}
              onIonInput={(e) => setSearchText(e.detail.value ?? "")}
              placeholder="Search songs..."
            />
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {allSongs.length === 0 ? (
            <div className="empty-songs-modal">
              <IonIcon icon={musicalNotesOutline} />
              <p>No songs in your library yet.</p>
              <p>Add some songs first!</p>
            </div>
          ) : (
            <IonList>
              {filteredSongs.map((song) => (
                <IonItem
                  key={song.id}
                  button
                  onClick={() => toggleSongSelection(song.id)}
                >
                  <IonCheckbox
                    slot="start"
                    checked={selectedSongIds.includes(song.id)}
                    onIonChange={() => toggleSongSelection(song.id)}
                  />
                  <IonLabel>
                    <h2>{song.title}</h2>
                    {song.artist && <p>{song.artist}</p>}
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          )}
        </IonContent>
      </IonModal>

      {/* Add Section Alert */}
      <IonAlert
        isOpen={showSectionAlert}
        header="Add Section"
        inputs={[
          {
            name: "sectionName",
            type: "text",
            placeholder: "e.g., Special Number, Offertory",
            value: newSectionName,
          },
        ]}
        buttons={[
          {
            text: "Cancel",
            role: "cancel",
            handler: () => setShowSectionAlert(false),
          },
          {
            text: "Add",
            handler: (data) => {
              setNewSectionName(data.sectionName || "");
              const section = createSetListSection(
                data.sectionName || "New Section",
              );
              setSections([...sections, section]);
              setShowSectionAlert(false);
            },
          },
        ]}
        onDidDismiss={() => setShowSectionAlert(false)}
      />

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

export default SetListEditor;
