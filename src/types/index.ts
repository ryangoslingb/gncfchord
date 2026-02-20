export type SongCategory = "praise" | "worship" | "other";

export interface Song {
  id: string;
  title: string;
  artist: string;
  category: SongCategory;
  lyrics: string; // lyrics with [Chord] inline notation, e.g. "[Am]Hello [G]world"
  createdAt: number;
  updatedAt: number;
}

// Set List Types - for service lineups
export interface SetListSection {
  id: string;
  name: string; // e.g., "Praise", "Worship", "Special Number"
  songIds: string[]; // IDs of songs in this section
}

export interface SetList {
  id: string;
  name: string; // e.g., "This Sunday Service", "Youth Night"
  date: string; // Date of the event (ISO string or display string)
  sections: SetListSection[];
  createdBy: string; // UID of the user who created this set list
  createdAt: number;
  updatedAt: number;
}
