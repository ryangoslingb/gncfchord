import React, { useEffect, useMemo, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
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
  IonBackButton,
  IonBadge,
  IonButton,
} from "@ionic/react";
import {
  add,
  listOutline,
  trash,
  calendarOutline,
  createOutline,
  chevronDownOutline,
  chevronForwardOutline,
} from "ionicons/icons";
import { useHistory } from "react-router-dom";
import {
  getAllSetLists,
  deleteSetList,
  getAllSongs,
} from "../utils/firebaseStorage";
import { useAuth } from "../contexts/AuthContext";
import { SetList, Song } from "../types";
import "./SetListHome.css";

const SetListHome: React.FC = () => {
  const history = useHistory();
  const { currentUser } = useAuth();
  const [setLists, setSetLists] = useState<SetList[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [songMap, setSongMap] = useState<Record<string, Song>>({});
  const [collapsedMonths, setCollapsedMonths] = useState<
    Record<string, boolean>
  >({});

  const loadSetLists = async () => {
    try {
      const [allSetLists, allSongs] = await Promise.all([
        getAllSetLists(),
        getAllSongs(),
      ]);
      setSetLists(allSetLists);
      const map: Record<string, Song> = {};
      allSongs.forEach((song) => {
        map[song.id] = song;
      });
      setSongMap(map);
    } catch {
      setSetLists([]);
      setSongMap({});
    }
  };

  useEffect(() => {
    loadSetLists();
    const unlisten = history.listen(() => loadSetLists());
    return unlisten;
  }, [history]);

  const handleDelete = async (id: string) => {
    await deleteSetList(id);
    loadSetLists();
    setDeleteId(null);
  };

  const getTotalSongs = (setList: SetList): number => {
    return setList.sections.reduce(
      (sum, section) => sum + section.songIds.length,
      0,
    );
  };

  const filteredSetLists = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return setLists;

    return setLists.filter((setList) => {
      for (const section of setList.sections) {
        for (const songId of section.songIds) {
          const song = songMap[songId];
          if (!song) continue;
          const haystack = `${song.title} ${song.artist}`.toLowerCase();
          if (haystack.includes(query)) return true;
        }
      }
      return false;
    });
  }, [setLists, songMap, searchQuery]);

  const parseSetListDate = (setList: SetList): Date | null => {
    const candidates = [setList.date, setList.name].filter(Boolean);
    for (const value of candidates) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return null;
  };

  const groupedSetLists = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; label: string; sortValue: number; items: SetList[] }
    >();

    filteredSetLists.forEach((setList) => {
      const parsedDate = parseSetListDate(setList);
      const key = parsedDate
        ? `${parsedDate.getFullYear()}-${parsedDate.getMonth()}`
        : "unknown";
      const label = parsedDate
        ? parsedDate.toLocaleString("en-US", {
            month: "long",
            year: "numeric",
          })
        : "Unknown Date";
      const sortValue = parsedDate
        ? new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1).getTime()
        : 0;

      if (!groups.has(key)) {
        groups.set(key, { key, label, sortValue, items: [] });
      }
      groups.get(key)?.items.push(setList);
    });

    const result = Array.from(groups.values());

    result.forEach((group) => {
      group.items.sort((a, b) => {
        const dateA = parseSetListDate(a)?.getTime() ?? 0;
        const dateB = parseSetListDate(b)?.getTime() ?? 0;
        return dateB - dateA;
      });
    });

    result.sort((a, b) => b.sortValue - a.sortValue);
    return result;
  }, [filteredSetLists]);

  useEffect(() => {
    if (groupedSetLists.length === 0) return;
    setCollapsedMonths((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next: Record<string, boolean> = {};
      groupedSetLists.forEach((group, index) => {
        next[group.key] = index !== 0;
      });
      return next;
    });
  }, [groupedSetLists]);

  const toggleMonth = (key: string) => {
    setCollapsedMonths((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <IonPage className="setlist-home-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" text="" />
          </IonButtons>
          <IonTitle className="setlist-home-title">
            <IonIcon icon={listOutline} className="title-icon" /> Set Lists
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="setlist-home-content">
        {setLists.length > 0 && (
          <div className="setlist-search">
            <IonSearchbar
              value={searchQuery}
              onIonInput={(e) => setSearchQuery(e.detail.value ?? "")}
              placeholder="Search by song title or artist"
              showClearButton="focus"
            />
          </div>
        )}

        {setLists.length === 0 ? (
          <div className="empty-state">
            <IonIcon icon={listOutline} className="empty-icon" />
            <IonText color="medium">
              <h2>No set lists yet</h2>
              <p>
                Create a lineup for your service. Tap <strong>+</strong> to add
                one.
              </p>
            </IonText>
          </div>
        ) : filteredSetLists.length === 0 ? (
          <div className="empty-state">
            <IonIcon icon={listOutline} className="empty-icon" />
            <IonText color="medium">
              <h2>No matching set lists</h2>
              <p>Try another song title or artist.</p>
            </IonText>
          </div>
        ) : (
          <IonList lines="full" className="setlist-list">
            {groupedSetLists.map((group) => {
              const hasQuery = searchQuery.trim().length > 0;
              const isCollapsed = hasQuery
                ? false
                : (collapsedMonths[group.key] ?? false);
              return (
                <div key={group.key} className="setlist-month-group">
                  <button
                    type="button"
                    className="setlist-month-header"
                    onClick={() => toggleMonth(group.key)}
                    aria-expanded={!isCollapsed}
                  >
                    <div className="month-header-left">
                      <IonIcon
                        icon={calendarOutline}
                        className="month-header-icon"
                      />
                      <div className="month-header-text">
                        <span className="month-header-title">
                          {group.label}
                        </span>
                        <span className="month-header-count">
                          {group.items.length} set lists
                        </span>
                      </div>
                    </div>
                    <IonIcon
                      icon={
                        isCollapsed ? chevronForwardOutline : chevronDownOutline
                      }
                      className="month-header-chevron"
                    />
                  </button>

                  {!isCollapsed &&
                    group.items.map((setList) => (
                      <IonItemSliding key={setList.id}>
                        <IonItem
                          button
                          detail={false}
                          onClick={() => history.push(`/setlist/${setList.id}`)}
                          className="setlist-item"
                        >
                          <IonIcon
                            icon={calendarOutline}
                            slot="start"
                            color="primary"
                          />
                          <IonLabel>
                            <h2 className="setlist-name">{setList.name}</h2>
                            <p className="setlist-date">{setList.date}</p>
                          </IonLabel>
                          <IonBadge color="primary">
                            {getTotalSongs(setList)} songs
                          </IonBadge>
                          <IonButton
                            slot="end"
                            fill="clear"
                            color="medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              history.push(`/setlist-editor/${setList.id}`);
                            }}
                          >
                            <IonIcon slot="icon-only" icon={createOutline} />
                          </IonButton>
                          {(!setList.createdBy ||
                            setList.createdBy === currentUser?.uid) && (
                            <IonButton
                              slot="end"
                              fill="clear"
                              color="danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(setList.id);
                              }}
                            >
                              <IonIcon slot="icon-only" icon={trash} />
                            </IonButton>
                          )}
                        </IonItem>
                        <IonItemOptions side="end">
                          {(!setList.createdBy ||
                            setList.createdBy === currentUser?.uid) && (
                            <IonItemOption
                              color="danger"
                              onClick={() => setDeleteId(setList.id)}
                            >
                              <IonIcon slot="icon-only" icon={trash} />
                            </IonItemOption>
                          )}
                        </IonItemOptions>
                      </IonItemSliding>
                    ))}
                </div>
              );
            })}
          </IonList>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton
            onClick={() => history.push("/setlist-editor/new")}
            color="primary"
          >
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>

      <IonAlert
        isOpen={deleteId !== null}
        header="Delete Set List"
        message="Are you sure you want to delete this set list? This cannot be undone."
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

export default SetListHome;
