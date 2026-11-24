import type { Ayah, Reciter, SurahMeta } from "./api";
import surahMetaOffline from "../data/surahMeta.json";

/* ---------- connectivity (shared, with manual offline switch) ---------- */
export { isOnline, useOnline, useConnection, isNetworkAllowed, getForceOffline, setForceOffline } from "./net";

export async function fetchWithTimeout(url: string, ms = 9000): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/* ---------- offline surah metadata (clean plain names) ---------- */
const OFFLINE_META = surahMetaOffline as SurahMeta[];
const NAME_BY_NUMBER = new Map<number, string>(OFFLINE_META.map((s) => [s.number, s.name]));

export function offlineSurahMeta(): SurahMeta[] {
  return OFFLINE_META;
}

export function plainSurahName(n: number): string {
  return NAME_BY_NUMBER.get(n) || `سورة ${n}`;
}

/** Normalize any online surah name to the clean plain name by number */
export function withPlainNames(list: SurahMeta[]): SurahMeta[] {
  return list.map((s) => ({ ...s, name: NAME_BY_NUMBER.get(s.number) || s.name }));
}

/* ---------- lazy offline bundles (dynamic import keeps startup light) ---------- */
let textsCache: string[][] | null = null;
let tafsirCache: string[][] | null = null;
let recitersCache: Reciter[] | null = null;
let juzCache: number[][] | null = null;

export async function getOfflineTexts(): Promise<string[][]> {
  if (!textsCache) {
    const m = await import("../data/quranTexts.json");
    textsCache = (m.default ?? m) as unknown as string[][];
  }
  return textsCache;
}

export async function getOfflineTafsir(): Promise<string[][]> {
  if (!tafsirCache) {
    const m = await import("../data/quranTafsir.json");
    tafsirCache = (m.default ?? m) as unknown as string[][];
  }
  return tafsirCache;
}

export async function getOfflineReciters(): Promise<Reciter[]> {
  if (!recitersCache) {
    const m = await import("../data/recitersOffline.json");
    const raw = (m.default ?? m) as { reciters?: Reciter[] };
    recitersCache = raw.reciters || [];
  }
  return recitersCache;
}

export async function getOfflineJuz(): Promise<number[][] | null> {
  try {
    if (!juzCache) {
      const m = await import("../data/quranJuz.json");
      juzCache = (m.default ?? m) as unknown as number[][];
    }
    return juzCache;
  } catch {
    return null;
  }
}

function globalBase(texts: string[][], surahNumber: number): number {
  let base = 0;
  for (let i = 0; i < surahNumber - 1; i++) base += texts[i].length;
  return base;
}

export async function offlineSurahText(surahNumber: number): Promise<Ayah[]> {
  const [texts, juz] = await Promise.all([getOfflineTexts(), getOfflineJuz()]);
  const arr = texts[surahNumber - 1] || [];
  const jarr = juz?.[surahNumber - 1];
  const base = globalBase(texts, surahNumber);
  return arr.map((text, i) => ({
    number: base + i + 1,
    text,
    numberInSurah: i + 1,
    juz: jarr?.[i] ?? 1,
  }));
}

export async function offlineSurahTafsir(surahNumber: number): Promise<Ayah[]> {
  const tafs = await getOfflineTafsir();
  const arr = tafs[surahNumber - 1] || [];
  const texts = await getOfflineTexts();
  const base = globalBase(texts, surahNumber);
  return arr.map((text, i) => ({
    number: base + i + 1,
    text,
    numberInSurah: i + 1,
    juz: 1,
  }));
}
