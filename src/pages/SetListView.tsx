import React, { useCallback, useEffect, useState } from "react";
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
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonText,
  IonReorderGroup,
  IonReorder,
  ItemReorderEventDetail,
  useIonViewWillEnter,
} from "@ionic/react";
import {
  createOutline,
  musicalNotesOutline,
  calendarOutline,
  playOutline,
  reorderThreeOutline,
  playCircle,
  downloadOutline,
} from "ionicons/icons";
import { useHistory, useParams } from "react-router-dom";
import {
  getSetListById,
  saveSetList,
  getAllSongs,
} from "../utils/firebaseStorage";
import { SetList, Song } from "../types";
import { jsPDF } from "jspdf";
import "./SetListView.css";

const SetListView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();

  const [setList, setSetList] = useState<SetList | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [songMap, setSongMap] = useState<Record<string, Song>>({});

  // Load all songs into a lookup map once
  useEffect(() => {
    getAllSongs()
      .then((all) => {
        const map: Record<string, Song> = {};
        all.forEach((s) => {
          map[s.id] = s;
        });
        setSongMap(map);
      })
      .catch(() => {});
  }, []);

  const loadSetList = useCallback(async () => {
    const sl = await getSetListById(id);
    if (sl) {
      setSetList(sl);
    } else {
      history.replace("/setlists");
    }
  }, [history, id]);

  useEffect(() => {
    loadSetList();
  }, [loadSetList]);

  useIonViewWillEnter(() => {
    loadSetList();
  }, [loadSetList]);

  const getTotalSongs = (): number => {
    if (!setList) return 0;
    return setList.sections.reduce(
      (sum, section) => sum + section.songIds.length,
      0,
    );
  };

  const getSongDetails = (songId: string): Song | undefined => {
    return songMap[songId];
  };

  // Get global index for a song (for play mode navigation)
  const getGlobalIndex = (
    sectionIndex: number,
    songIndexInSection: number,
  ): number => {
    if (!setList) return 0;
    let globalIndex = 0;
    for (let i = 0; i < sectionIndex; i++) {
      globalIndex += setList.sections[i].songIds.length;
    }
    return globalIndex + songIndexInSection;
  };

  // Handle reorder within a section
  const handleReorder = (
    sectionId: string,
    event: CustomEvent<ItemReorderEventDetail>,
  ) => {
    if (!setList) return;

    const updatedSections = setList.sections.map((section) => {
      if (section.id === sectionId) {
        const songIds = [...section.songIds];
        const [movedItem] = songIds.splice(event.detail.from, 1);
        songIds.splice(event.detail.to, 0, movedItem);
        return { ...section, songIds };
      }
      return section;
    });

    const updatedSetList = { ...setList, sections: updatedSections };
    setSetList(updatedSetList);
    saveSetList(updatedSetList).catch(console.error);

    event.detail.complete();
  };

  // Start play mode
  const startPlayMode = (sectionIndex: number = 0, songIndex: number = 0) => {
    const globalIndex = getGlobalIndex(sectionIndex, songIndex);
    history.push(`/setlist-play/${id}/${globalIndex}`);
  };

  // Convert [Chord]lyrics notation to chord-over-lyrics lines
  const buildChordLines = (lyrics: string): string[] => {
    const lines = lyrics.split("\n");
    const out: string[] = [];
    for (const line of lines) {
      if (!line.includes("[")) {
        out.push(line);
        continue;
      }
      let chordLine = "";
      let lyricLine = "";
      let i = 0;
      while (i < line.length) {
        if (line[i] === "[") {
          const end = line.indexOf("]", i);
          if (end === -1) {
            lyricLine += line[i++];
            continue;
          }
          const chord = line.slice(i + 1, end);
          const pad = Math.max(0, lyricLine.length - chordLine.length);
          chordLine += " ".repeat(pad) + chord;
          i = end + 1;
        } else {
          if (lyricLine.length < chordLine.length) {
            lyricLine += " ";
          }
          lyricLine += line[i++];
        }
      }
      if (chordLine.trim()) out.push(chordLine);
      if (lyricLine.trim()) out.push(lyricLine);
    }
    return out;
  };

  const handleDownloadPDF = () => {
    if (!setList) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = 210;
    const pageH = 297;
    const marginL = 15;
    const marginR = 15;
    const marginT = 20;
    const marginB = 20;
    const usableW = pageW - marginL - marginR;
    let y = marginT;

    const checkPage = (needed: number) => {
      if (y + needed > pageH - marginB) {
        doc.addPage();
        y = marginT;
      }
    };

    // Set list title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize(setList.name, usableW);
    doc.text(titleLines, marginL, y);
    y += titleLines.length * 9 + 2;

    // Date
    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(setList.date, marginL, y);
    y += 7;
    doc.setTextColor(0, 0, 0);

    // Divider
    doc.setLineWidth(0.5);
    doc.line(marginL, y, pageW - marginR, y);
    y += 8;

    // Section order: praise first, then worship, then others
    const sectionOrder = ["praise", "worship"];
    const sorted = [
      ...setList.sections
        .filter((s) =>
          sectionOrder.some((o) => s.name.toLowerCase().includes(o)),
        )
        .sort(
          (a, b) =>
            sectionOrder.findIndex((o) => a.name.toLowerCase().includes(o)) -
            sectionOrder.findIndex((o) => b.name.toLowerCase().includes(o)),
        ),
      ...setList.sections.filter(
        (s) => !sectionOrder.some((o) => s.name.toLowerCase().includes(o)),
      ),
    ];

    for (const section of sorted) {
      if (section.songIds.length === 0) continue;

      // Section header
      checkPage(14);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 80, 200);
      doc.text(section.name.toUpperCase(), marginL, y);
      y += 2;
      doc.setLineWidth(0.3);
      doc.setDrawColor(30, 80, 200);
      doc.line(
        marginL,
        y,
        marginL + doc.getTextWidth(section.name.toUpperCase()),
        y,
      );
      doc.setDrawColor(0, 0, 0);
      y += 7;
      doc.setTextColor(0, 0, 0);

      for (let si = 0; si < section.songIds.length; si++) {
        const song = songMap[section.songIds[si]];
        if (!song) continue;

        // Song number + title
        checkPage(16);
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        const songTitle = `${si + 1}. ${song.title}`;
        const titleWrapped = doc.splitTextToSize(songTitle, usableW);
        doc.text(titleWrapped, marginL, y);
        y += titleWrapped.length * 7 + 1;

        // Artist
        if (song.artist) {
          checkPage(7);
          doc.setFontSize(12);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(90, 90, 90);
          doc.text(song.artist, marginL + 4, y);
          y += 6;
          doc.setTextColor(0, 0, 0);
        }

        // Lyrics
        const lyricLines = buildChordLines(song.lyrics);
        for (const line of lyricLines) {
          if (!line.trim()) {
            y += 3;
            continue;
          }
          // Chord lines use smaller monospace-style text
          const isChordLine =
            /^[A-G][#b]?/.test(line.trim()) &&
            line
              .trim()
              .split(/\s+/)
              .every((t) => /^[A-G][#b]?[a-z0-9/]*$/.test(t));
          checkPage(7);
          if (isChordLine) {
            doc.setFontSize(11);
            doc.setFont("courier", "bold");
            doc.setTextColor(40, 100, 220);
          } else {
            doc.setFontSize(13);
            doc.setFont("courier", "normal");
            doc.setTextColor(20, 20, 20);
          }
          const wrapped = doc.splitTextToSize(line, usableW - 4);
          doc.text(wrapped, marginL + 4, y);
          y += wrapped.length * (isChordLine ? 5 : 6.5);
        }

        y += 6; // gap after song
        doc.setTextColor(0, 0, 0);
      }

      y += 4; // gap after section
    }

    doc.save(`${setList.name.replace(/\s+/g, "_")}.pdf`);
  };

  if (!setList)
    return (
      <IonPage>
        <IonContent />
      </IonPage>
    );

  return (
    <IonPage className="setlist-view-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/setlists" text="" />
          </IonButtons>
          <IonTitle className="setlist-view-title">{setList.name}</IonTitle>
          <IonButtons slot="end">
            <IonButton
              onClick={() => setIsReordering(!isReordering)}
              color={isReordering ? "primary" : undefined}
            >
              <IonIcon slot="icon-only" icon={reorderThreeOutline} />
            </IonButton>
            <IonButton
              onClick={() => history.push(`/setlist-editor/${setList.id}`)}
            >
              <IonIcon slot="icon-only" icon={createOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="setlist-view-content">
        {/* Header info */}
        <div className="setlist-info">
          <div className="info-row">
            <IonIcon icon={calendarOutline} />
            <span>{setList.date}</span>
          </div>
          <div className="info-row">
            <IonIcon icon={musicalNotesOutline} />
            <span>{getTotalSongs()} songs in lineup</span>
          </div>
          {getTotalSongs() > 0 && (
            <div className="setlist-action-btns">
              <IonButton
                className="play-all-btn"
                color="primary"
                onClick={() => startPlayMode(0, 0)}
              >
                <IonIcon slot="start" icon={playCircle} />
                Play Set List
              </IonButton>
              <IonButton
                className="play-all-btn"
                color="success"
                onClick={handleDownloadPDF}
              >
                <IonIcon slot="start" icon={downloadOutline} />
                Download PDF
              </IonButton>
            </div>
          )}
        </div>

        {isReordering && (
          <div className="reorder-hint">
            <IonIcon icon={reorderThreeOutline} />
            <span>Drag songs to reorder. Tap the icon again when done.</span>
          </div>
        )}

        {/* Sections */}
        {setList.sections.length === 0 ? (
          <div className="empty-state">
            <p>No sections in this set list yet.</p>
            <IonButton
              fill="outline"
              onClick={() => history.push(`/setlist-editor/${setList.id}`)}
            >
              <IonIcon slot="start" icon={createOutline} />
              Edit Set List
            </IonButton>
          </div>
        ) : (
          setList.sections.map((section) => (
            <div key={section.id} className="section-block">
              <div className="section-title">
                <span>{section.name}</span>
                <IonBadge color="primary">{section.songIds.length}</IonBadge>
              </div>

              {section.songIds.length === 0 ? (
                <div className="empty-section">
                  <p>No songs in this section</p>
                </div>
              ) : (
                <IonList className="song-list">
                  <IonReorderGroup
                    disabled={!isReordering}
                    onIonItemReorder={(e) => handleReorder(section.id, e)}
                  >
                    {section.songIds.map((songId, index) => {
                      const song = getSongDetails(songId);
                      if (!song) return null;
                      const sectionIndex = setList.sections.findIndex(
                        (s) => s.id === section.id,
                      );

                      return (
                        <IonItem
                          key={songId}
                          button={!isReordering}
                          detail={!isReordering}
                          onClick={() =>
                            !isReordering && startPlayMode(sectionIndex, index)
                          }
                          className="song-item"
                        >
                          <div className="song-number" slot="start">
                            {index + 1}
                          </div>
                          <IonLabel>
                            <h2>{song.title}</h2>
                            {song.artist && <p>{song.artist}</p>}
                          </IonLabel>
                          {isReordering ? (
                            <IonReorder slot="end" />
                          ) : (
                            <IonIcon
                              icon={playOutline}
                              slot="end"
                              color="primary"
                            />
                          )}
                        </IonItem>
                      );
                    })}
                  </IonReorderGroup>
                </IonList>
              )}
            </div>
          ))
        )}

        <div style={{ height: 40 }} />
      </IonContent>
    </IonPage>
  );
};

export default SetListView;
