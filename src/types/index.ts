export interface Song {
  id: string;
  title: string;
  artist: string;
  lyrics: string; // lyrics with [Chord] inline notation, e.g. "[Am]Hello [G]world"
  createdAt: number;
  updatedAt: number;
}
