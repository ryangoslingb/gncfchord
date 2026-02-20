/**
 * Firebase Realtime Database storage — same API as storage.ts but async.
 * Songs:    users/{uid}/songs/{songId}
 * SetLists: users/{uid}/setlists/{setlistId}
 */
import { ref, set, get, remove } from "firebase/database";
import { rtdb, auth } from "../firebase/config";
import { Song, SetList, SongCategory, SetListSection } from "../types";

// ─── Shared paths (all authenticated users read/write the same data) ─────────

const songsRef = () => ref(rtdb, "songs");
const songRef = (songId: string) => ref(rtdb, `songs/${songId}`);
const setListsRef = () => ref(rtdb, "setlists");
const setListRef = (setListId: string) => ref(rtdb, `setlists/${setListId}`);

// ─── Songs ──────────────────────────────────────────────────────────────────

/** Fetch all songs (shared across all users) */
export async function getAllSongs(): Promise<Song[]> {
  const snapshot = await get(songsRef());
  if (!snapshot.exists()) return [];
  const data = snapshot.val() as Record<string, Song>;
  return Object.values(data).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Fetch a single song by ID */
export async function getSongById(id: string): Promise<Song | undefined> {
  const snapshot = await get(songRef(id));
  if (!snapshot.exists()) return undefined;
  return snapshot.val() as Song;
}

/** Save (create or update) a song */
export async function saveSong(song: Song): Promise<void> {
  await set(songRef(song.id), song);
}

/** Delete a song by ID */
export async function deleteSong(id: string): Promise<void> {
  await remove(songRef(id));
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

// ─── Set Lists ───────────────────────────────────────────────────────────────

/** Fetch all set lists (shared across all users) */
export async function getAllSetLists(): Promise<SetList[]> {
  const snapshot = await get(setListsRef());
  if (!snapshot.exists()) return [];
  const data = snapshot.val() as Record<string, any>;
  return Object.values(data)
    .map(normalizeSetList)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Fetch a single set list by ID */
function normalizeSections(
  sections: Record<string, any> | any[] | undefined,
): SetListSection[] {
  if (!sections) return [];
  const list = Array.isArray(sections) ? sections : Object.values(sections);
  return list.map((section: any) => ({
    id: section.id,
    name: section.name,
    songIds: Array.isArray(section.songIds)
      ? section.songIds
      : Object.values(section.songIds || {}),
  }));
}

function normalizeSetList(raw: any): SetList {
  return {
    ...raw,
    sections: normalizeSections(raw.sections),
  };
}

export async function getSetListById(id: string): Promise<SetList | undefined> {
  const snapshot = await get(setListRef(id));
  if (!snapshot.exists()) return undefined;
  return normalizeSetList(snapshot.val());
}

/** Save (create or update) a set list */
export async function saveSetList(setList: SetList): Promise<void> {
  await set(setListRef(setList.id), setList);
}

/** Delete a set list by ID (only the creator can delete) */
export async function deleteSetList(id: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  const setList = await getSetListById(id);
  if (!setList) return;
  if (setList.createdBy && setList.createdBy !== uid) {
    throw new Error("You can only delete set lists you created.");
  }
  await remove(setListRef(id));
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
