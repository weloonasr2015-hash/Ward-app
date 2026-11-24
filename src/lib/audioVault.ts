/* ============================================================
   Offline audio vault — IndexedDB storage for downloaded MP3s
   Lets the user save surahs while online and play them
   with zero internet afterwards.
   ============================================================ */

const DB_NAME = "waleed-sebai-vault";
const STORE = "tracks";
const DB_VERSION = 1;

export interface SavedTrack {
  key: string;
  blob: Blob;
  surah: number;
  surahName: string;
  reciter: string;
  reciterId: number;
  moshaf: string;
  moshafId: number;
  savedAt: number;
  bytes: number;
}

export function vaultKey(reciterId: number, moshafId: number, surah: number): string {
  return `r${reciterId}_m${moshafId}_s${surah}`;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("no-idb"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("idb-open"));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        let out: T;
        try {
          const req = run(store);
          req.onsuccess = () => { out = req.result as T; };
          req.onerror = () => reject(req.error || new Error("idb-req"));
        } catch (e) {
          reject(e);
          return;
        }
        t.oncomplete = () => { db.close(); resolve(out!); };
        t.onerror = () => { db.close(); reject(t.error || new Error("idb-tx")); };
        t.onabort = () => { db.close(); reject(t.error || new Error("idb-abort")); };
      })
  );
}

export async function isTrackSaved(key: string): Promise<boolean> {
  try {
    const r = await tx<unknown>("readonly", (s) => s.get(key));
    return r !== undefined && r !== null;
  } catch {
    return false;
  }
}

export async function saveTrack(
  key: string,
  meta: { surah: number; surahName: string; reciter: string; reciterId: number; moshaf: string; moshafId: number },
  url: string,
  onProgress?: (loaded: number, total: number | null) => void
): Promise<number> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    // fallback: plain blob (no progress)
    const blob = await res.blob();
    const rec: SavedTrack = { key, blob, ...meta, savedAt: Date.now(), bytes: blob.size };
    await tx("readwrite", (s) => s.put(rec));
    urlCache.delete(key);
    return blob.size;
  }
  const total = Number(res.headers.get("content-length")) || null;
  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress?.(loaded, total);
  }
  const blob = new Blob(chunks, { type: res.headers.get("content-type") || "audio/mpeg" });
  const rec: SavedTrack = { key, blob, ...meta, savedAt: Date.now(), bytes: blob.size };
  await tx("readwrite", (s) => s.put(rec));
  urlCache.delete(key);
  return blob.size;
}

export async function getSavedBlob(key: string): Promise<Blob | null> {
  try {
    const rec = await tx<SavedTrack | undefined>("readonly", (s) => s.get(key));
    return rec?.blob || null;
  } catch {
    return null;
  }
}

export async function listSavedTracks(): Promise<SavedTrack[]> {
  try {
    const all = await tx<SavedTrack[]>("readonly", (s) => s.getAll());
    return (all || []).sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export async function removeTrack(key: string): Promise<void> {
  try {
    await tx("readwrite", (s) => s.delete(key));
  } catch { /* ignore */ }
  const u = urlCache.get(key);
  if (u) {
    URL.revokeObjectURL(u);
    urlCache.delete(key);
  }
}

export async function clearVault(): Promise<void> {
  try {
    await tx("readwrite", (s) => s.clear());
  } catch { /* ignore */ }
  urlCache.forEach((u) => URL.revokeObjectURL(u));
  urlCache.clear();
}

export async function vaultUsage(): Promise<{ bytes: number; count: number }> {
  try {
    const all = await listSavedTracks();
    return { bytes: all.reduce((a, t) => a + (t.bytes || 0), 0), count: all.length };
  } catch {
    return { bytes: 0, count: 0 };
  }
}

/* Resolve a playable URL: cached blob wins, remote otherwise */
const urlCache = new Map<string, string>();

export async function resolveAudioUrl(key: string, remoteUrl: string): Promise<{ url: string; cached: boolean }> {
  if (urlCache.has(key)) return { url: urlCache.get(key)!, cached: true };
  const blob = await getSavedBlob(key);
  if (blob) {
    const u = URL.createObjectURL(blob);
    urlCache.set(key, u);
    return { url: u, cached: true };
  }
  return { url: remoteUrl, cached: false };
}

export function formatBytes(b: number): string {
  if (!b) return "0 بايت";
  if (b < 1024) return `${b} بايت`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} ك.ب`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} م.ب`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} ج.ب`;
}
