import { Song, SetList, SetListSection, SongCategory } from "../types";

const STORAGE_KEY = "chordshift_songs";
const SETLIST_STORAGE_KEY = "chordshift_setlists";

export function getAllSongs(): Song[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getSongById(id: string): Song | undefined {
  return getAllSongs().find((s) => s.id === id);
}

export function saveSong(song: Song): void {
  const songs = getAllSongs();
  const idx = songs.findIndex((s) => s.id === song.id);
  if (idx >= 0) {
    songs[idx] = song;
  } else {
    songs.unshift(song);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

export function deleteSong(id: string): void {
  const songs = getAllSongs().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

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

// =========== Set List Storage Functions ===========

export function getAllSetLists(): SetList[] {
  try {
    const raw = localStorage.getItem(SETLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getSetListById(id: string): SetList | undefined {
  return getAllSetLists().find((s) => s.id === id);
}

export function saveSetList(setList: SetList): void {
  const setLists = getAllSetLists();
  const idx = setLists.findIndex((s) => s.id === setList.id);
  if (idx >= 0) {
    setLists[idx] = setList;
  } else {
    setLists.unshift(setList);
  }
  localStorage.setItem(SETLIST_STORAGE_KEY, JSON.stringify(setLists));
}

export function deleteSetList(id: string): void {
  const setLists = getAllSetLists().filter((s) => s.id !== id);
  localStorage.setItem(SETLIST_STORAGE_KEY, JSON.stringify(setLists));
}

export function createSetList(name: string, date: string): SetList {
  const now = Date.now();
  return {
    id: `setlist_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || "Untitled Set List",
    date,
    sections: [
      { id: `section_${now}_1`, name: "Praise", songIds: [] },
      { id: `section_${now}_2`, name: "Worship", songIds: [] },
    ],
    createdBy: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function createSetListSection(name: string): SetListSection {
  const now = Date.now();
  return {
    id: `section_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || "New Section",
    songIds: [],
  };
}
