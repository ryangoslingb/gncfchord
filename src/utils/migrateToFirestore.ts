/**
 * One-time migration: Realtime Database → Firestore
 *
 * Reads all songs and setlists from the Realtime Database and copies them
 * into Firestore. Safe to run multiple times — setDoc with the document ID
 * will just overwrite unchanged data.
 *
 * Usage: triggered by the "Migrate Data" button on Home.tsx.
 * After a successful run the button is hidden forever (stored in localStorage).
 */
import { ref, get } from "firebase/database";
import { rtdb } from "../firebase/config";
import { saveSong, saveSetList } from "./firebaseStorage";
import { Song, SetList, SetListSection } from "../types";

function normalizeSections(
  sections: Record<string, any> | any[] | undefined,
): SetListSection[] {
  if (!sections) return [];
  const list = Array.isArray(sections) ? sections : Object.values(sections);
  return list.map((s: any) => ({
    id: s.id,
    name: s.name,
    songIds: Array.isArray(s.songIds)
      ? s.songIds
      : Object.values(s.songIds || {}),
  }));
}

function normalizeSetList(raw: any): SetList {
  return {
    ...raw,
    createdBy: raw.createdBy ?? "",
    sections: normalizeSections(raw.sections),
  };
}

export type MigrationResult = {
  songs: number;
  setlists: number;
};

export async function migrateRtdbToFirestore(): Promise<MigrationResult> {
  let songCount = 0;
  let setlistCount = 0;

  // ── Migrate songs ──────────────────────────────────────────────────────────
  const songsSnap = await get(ref(rtdb, "songs"));
  if (songsSnap.exists()) {
    const songs = songsSnap.val() as Record<string, Song>;
    for (const song of Object.values(songs)) {
      await saveSong(song);
      songCount++;
    }
  }

  // ── Migrate setlists ───────────────────────────────────────────────────────
  const setlistsSnap = await get(ref(rtdb, "setlists"));
  if (setlistsSnap.exists()) {
    const raw = setlistsSnap.val() as Record<string, any>;
    for (const item of Object.values(raw)) {
      await saveSetList(normalizeSetList(item));
      setlistCount++;
    }
  }

  // Mark migration as done so the button is never shown again
  localStorage.setItem("rtdb_migrated", "true");

  return { songs: songCount, setlists: setlistCount };
}

export function isMigrated(): boolean {
  return localStorage.getItem("rtdb_migrated") === "true";
}
