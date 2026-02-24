import React, { useEffect, useState } from "react";
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
  IonModal,
  IonSearchbar,
  IonCheckbox,
  IonAlert,
  IonItem,
  IonLabel,
  IonList,
  IonDatetime,
} from "@ionic/react";
import {
  save,
  addCircleOutline,
  musicalNotesOutline,
  trashOutline,
  reorderThreeOutline,
  closeOutline,
  checkmarkOutline,
  calendarOutline,
  listOutline,
  serverOutline,
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

  // Date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateISO, setDateISO] = useState("");

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
          setDateISO(parseStoredDateToISO(setList.date));
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
        const nextSundayISO = getNextSundayISO();
        setDateISO(nextSundayISO);
        setDate(formatDateDisplay(nextSundayISO));
      }
    };
    load();
  }, [id, isNew, history]);

  const getNextSundayISO = (): string => {
    const today = new Date();
    const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
    const next = new Date(today);
    next.setDate(today.getDate() + daysUntilSunday);
    return next.toISOString().split("T")[0]; // YYYY-MM-DD
  };

  const formatDateDisplay = (isoStr: string): string => {
    if (!isoStr) return "";
    const d = new Date(isoStr + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const parseStoredDateToISO = (dateStr: string): string => {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
    return "";
  };

  const handleDateChange = (isoValue: string) => {
    const iso = isoValue.split("T")[0];
    setDateISO(iso);
    setDate(formatDateDisplay(iso));
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
        <IonToolbar className="sle-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/setlists" text="" color="light" />
          </IonButtons>
          <IonTitle className="sle-header-title">
            {isNew ? "New Set List" : "Edit Set List"}
          </IonTitle>
          <IonButtons slot="end">
            <button className="save-pill-btn" onClick={handleSave}>
              <IonIcon icon={save} />
              <span>SAVE</span>
            </button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="setlist-editor-content">
        {/* ── Info card ── */}
        <div className="sle-card">
          {/* Name field */}
          <div className="sle-field-group">
            <label className="sle-field-label">SET LIST NAME</label>
            <div className="sle-input-wrap">
              <IonIcon icon={listOutline} className="sle-input-icon" />
              <IonInput
                className="sle-input"
                value={name}
                onIonInput={(e) => setName(e.detail.value ?? "")}
                placeholder="e.g., This Sunday Service"
              />
            </div>
          </div>

          <div className="sle-divider" />

          {/* Date field */}
          <div className="sle-field-group">
            <label className="sle-field-label">DATE / EVENT</label>
            <div className="sle-input-wrap sle-input-wrap--date">
              <IonIcon icon={calendarOutline} className="sle-input-icon" />
              <button
                className="sle-date-btn"
                onClick={() => setShowDatePicker(true)}
              >
                {date ? (
                  date
                ) : (
                  <span className="sle-date-placeholder">Pick a date…</span>
                )}
              </button>
              {date ? (
                <button
                  className="sle-clear-btn"
                  onClick={() => {
                    setDate("");
                    setDateISO("");
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Sections header ── */}
        <div className="sle-sections-header">
          <div className="sle-sections-title-row">
            <span className="sle-sections-title">Lineup Sections</span>
            {sections.length > 0 && (
              <span className="sle-sections-badge">{sections.length}</span>
            )}
          </div>
          <button
            className="sle-add-section-btn"
            onClick={() => setShowSectionAlert(true)}
          >
            <IonIcon icon={addCircleOutline} />
            ADD SECTION
          </button>
        </div>

        {/* ── Timeline + section cards ── */}
        <div className="sle-timeline">
          {sections.map((section, idx) => (
            <div key={section.id} className="sle-timeline-row">
              {/* Left timeline */}
              <div className="sle-timeline-left">
                <div className="sle-timeline-dot">
                  <IonIcon icon={musicalNotesOutline} />
                </div>
                {idx < sections.length - 1 && (
                  <div className="sle-timeline-line" />
                )}
              </div>

              {/* Section card */}
              <div className="sle-section-card">
                <div className="sle-section-header">
                  <IonIcon
                    icon={reorderThreeOutline}
                    className="sle-drag-handle"
                  />
                  <span className="sle-section-name">{section.name}</span>
                  <div className="sle-section-actions">
                    <button
                      className="sle-icon-btn"
                      onClick={() => openSongPicker(section.id)}
                    >
                      +
                    </button>
                    <button
                      className="sle-icon-btn sle-icon-btn--trash"
                      onClick={() => removeSection(section.id)}
                    >
                      <IonIcon icon={trashOutline} />
                    </button>
                  </div>
                </div>

                {section.songIds.length === 0 ? (
                  <div className="sle-empty-section">
                    <p>No songs yet.</p>
                    <span>Tap + to add songs</span>
                  </div>
                ) : (
                  <div className="sle-section-songs">
                    {section.songIds.map((songId, si) => (
                      <div key={songId} className="sle-song-row">
                        <span className="sle-song-number">{si + 1}.</span>
                        <div className="sle-song-info">
                          <span className="sle-song-title">
                            {getSongTitle(songId)}
                          </span>
                          {getSongArtist(songId) && (
                            <span className="sle-song-artist">
                              {getSongArtist(songId)}
                            </span>
                          )}
                        </div>
                        <button
                          className="sle-icon-btn"
                          onClick={() =>
                            removeSongFromSection(section.id, songId)
                          }
                        >
                          <IonIcon icon={closeOutline} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* End of lineup */}
          {sections.length > 0 && (
            <div className="sle-timeline-end">
              <div className="sle-timeline-end-dot" />
              <span className="sle-timeline-end-label">End of lineup</span>
            </div>
          )}

          {sections.length === 0 && (
            <div className="sle-empty-sections">
              <p>No sections yet. Tap “ADD SECTION” to start.</p>
            </div>
          )}
        </div>

        <div style={{ height: 16 }} />
      </IonContent>

      {/* ── Sticky footer CTA ── */}
      <IonFooter className="sle-footer">
        <button className="sle-create-btn" onClick={handleSave}>
          <IonIcon icon={serverOutline} />
          <span>{isNew ? "CREATE SET LIST" : "UPDATE SET LIST"}</span>
        </button>
      </IonFooter>

      {/* Date Picker Modal */}
      <IonModal
        isOpen={showDatePicker}
        onDidDismiss={() => setShowDatePicker(false)}
        className="sle-date-picker-modal"
        initialBreakpoint={0.5}
        breakpoints={[0, 0.5]}
        keepContentsMounted
      >
        <IonContent className="sle-date-picker-content">
          <IonDatetime
            presentation="date"
            value={dateISO || undefined}
            preferWheel={false}
            onIonChange={(e) => {
              const val = Array.isArray(e.detail.value)
                ? e.detail.value[0]
                : e.detail.value;
              if (val) {
                handleDateChange(val);
                setShowDatePicker(false);
              }
            }}
          />
        </IonContent>
      </IonModal>

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
            <div className="sle-empty-songs-modal">
              <IonIcon icon={musicalNotesOutline} />
              <p>No songs in your library yet.</p>
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
