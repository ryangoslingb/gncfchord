/**
 * Firestore storage (replaces Realtime Database).
 * Offline persistence is enabled via persistentLocalCache in firebase/config.ts.
 *
 * Collections (shared across all authenticated users):
 *   songs/{songId}
 *   setlists/{setlistId}
 */
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { Song, SetList, SongCategory, SetListSection } from "../types";

// ─── Collection helpers ───────────────────────────────────────────────────────
const songsCol = () => collection(db, "songs");
const songDoc = (songId: string) => doc(db, "songs", songId);
const setListsCol = () => collection(db, "setlists");
const setListDoc = (id: string) => doc(db, "setlists", id);

// ─── Songs ────────────────────────────────────────────────────────────────────

/** Fetch all songs (shared across all users) */
export async function getAllSongs(): Promise<Song[]> {
  const snap = await getDocs(songsCol());
  if (snap.empty) return [];
  return snap.docs
    .map((d) => d.data() as Song)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Fetch a single song by ID */
export async function getSongById(id: string): Promise<Song | undefined> {
  const snap = await getDoc(songDoc(id));
  if (!snap.exists()) return undefined;
  return snap.data() as Song;
}

/** Save (create or update) a song */
export async function saveSong(song: Song): Promise<void> {
  await setDoc(songDoc(song.id), song);
}

/** Delete a song by ID */
export async function deleteSong(id: string): Promise<void> {
  await deleteDoc(songDoc(id));
}

/** Create a new Song object (does NOT save — call saveSong after) */
export function createSong(
  title: string,
  artist: string,
  lyrics: string,
  category: SongCategory = "other",
): Song {
  const now = Date.now();
  return {
    id: `song_${now}_${Math.random().toString(36).slice(2, 8)}`,
    title: title.trim() || "Untitled Song",
    artist: artist.trim(),
    category,
    lyrics,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Set Lists ────────────────────────────────────────────────────────────────

/** Fetch all set lists (shared across all users) */
export async function getAllSetLists(): Promise<SetList[]> {
  const snap = await getDocs(setListsCol());
  if (snap.empty) return [];
  return snap.docs
    .map((d) => d.data() as SetList)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Fetch a single set list by ID */
export async function getSetListById(id: string): Promise<SetList | undefined> {
  const snap = await getDoc(setListDoc(id));
  if (!snap.exists()) return undefined;
  return snap.data() as SetList;
}

/** Save (create or update) a set list */
export async function saveSetList(setList: SetList): Promise<void> {
  await setDoc(setListDoc(setList.id), setList);
}

/** Delete a set list by ID (only the creator can delete) */
export async function deleteSetList(id: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  const setList = await getSetListById(id);
  if (!setList) return;
  if (setList.createdBy && setList.createdBy !== uid) {
    throw new Error("You can only delete set lists you created.");
  }
  await deleteDoc(setListDoc(id));
}

/** Create a new SetListSection object */
export function createSetListSection(name: string): SetListSection {
  const now = Date.now();
  return {
    id: `section_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || "Untitled Section",
    songIds: [],
  };
}

/** Create a new SetList object (does NOT save — call saveSetList after) */
export function createSetList(name: string, date: string): SetList {
  const now = Date.now();
  const uid = auth.currentUser?.uid ?? "";
  return {
    id: `setlist_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || "Untitled Set List",
    date,
    sections: [
      { id: `section_${now}_1`, name: "Praise", songIds: [] },
      { id: `section_${now}_2`, name: "Worship", songIds: [] },
    ],
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
  };
}
