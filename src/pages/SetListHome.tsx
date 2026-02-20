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
} from "ionicons/icons";
import { useHistory } from "react-router-dom";
import { getAllSetLists, deleteSetList } from "../utils/firebaseStorage";
import { useAuth } from "../contexts/AuthContext";
import { SetList } from "../types";
import "./SetListHome.css";

const SetListHome: React.FC = () => {
  const history = useHistory();
  const { currentUser } = useAuth();
  const [setLists, setSetLists] = useState<SetList[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadSetLists = async () => {
    try {
      const all = await getAllSetLists();
      setSetLists(all);
    } catch {
      setSetLists([]);
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
        ) : (
          <IonList lines="full" className="setlist-list">
            {setLists.map((setList) => (
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
