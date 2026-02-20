import { Song } from "../types";

const STORAGE_KEY = "chordshift_songs";

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
): Song {
  const now = Date.now();
  return {
    id: `song_${now}_${Math.random().toString(36).slice(2, 8)}`,
    title: title.trim() || "Untitled Song",
    artist: artist.trim(),
    lyrics,
    createdAt: now,
    updatedAt: now,
  };
}
