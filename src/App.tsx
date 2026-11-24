import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen, Mic2, BookOpenText, Sparkles, MoonStar, Heart,
  Search, X, Play, Menu, ChevronLeft, History, MapPin, BellRing, Moon,
  Wifi, WifiOff, HardDrive, Trash2, Satellite,
} from "lucide-react";
import Surahs from "./components/Surahs";
import Reciters from "./components/Reciters";
import Mushaf from "./components/Mushaf";
import Adhkar from "./components/Adhkar";
import Prayer from "./components/Prayer";
import { consumeLaunchTab } from "./lib/install";
import { initNative } from "./lib/native";
import { isNetworkAllowed } from "./lib/net";
import Player, { getAudio, type Track, type SaveState } from "./components/Player";
import { Equalizer, FavHeart, SectionHead } from "./components/shared";
import {
  fetchReciters, fetchSurahsMeta, fetchSurahText, fetchSurahTafsir,
  fetchPrayerByCity, fetchPrayerByCoords, surahAudioUrl, parseSurahList,
  getFastingAlerts, getPrayerSource, sortReciters,
  type Reciter, type SurahMeta, type Ayah, type PrayerData,
} from "./lib/api";
import { useConnection, plainSurahName } from "./lib/offline";
import NotificationCenter, { BellButton } from "./components/NotificationCenter";
import Assistant, { AssistantFab, type ChatMessage } from "./components/Assistant";
import {
  DEFAULT_NOTIF_SETTINGS, buildAutoReminders, mergeAutoReminders,
  processDue, makeReminder, showNotification, requestNotificationPermission,
  salawatReminderContent, GENTLE_NUDGES, syncNativeNotifications, cancelAllNative,
  type NotifSettings, type Reminder,
} from "./lib/notify";
import { DEFAULT_AI_CONFIG, type AIConfig, type AssistantAction, type AssistantContext } from "./lib/assistant";
import { morningAdhkar, eveningAdhkar } from "./data/adhkar";
import { upcomingFasting } from "./lib/api";
import { normAr } from "./lib/api";
import {
  vaultKey, resolveAudioUrl, saveTrack, isTrackSaved,
  listSavedTracks, removeTrack, clearVault, vaultUsage, formatBytes,
  type SavedTrack,
} from "./lib/audioVault";
import { cn } from "./utils/cn";

/* ---------- localStorage helpers ---------- */
function useLS<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw) as T;
    } catch { /* ignore */ }
    return initial;
  });
  const set = (v: T | ((p: T) => T)) => {
    setVal((prev) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  return [val, set];
}

type Tab = "surahs" | "reciters" | "mushaf" | "adhkar" | "prayer" | "favs";

const TABS: { id: Tab; label: string; Icon: typeof BookOpen }[] = [
  { id: "surahs", label: "السور", Icon: BookOpen },
  { id: "reciters", label: "القراء", Icon: Mic2 },
  { id: "mushaf", label: "المصحف", Icon: BookOpenText },
  { id: "adhkar", label: "الأذكار", Icon: Sparkles },
  { id: "prayer", label: "مواقيت الصلاة", Icon: MoonStar },
  { id: "favs", label: "المفضلة", Icon: Heart },
];

function BrandEmblem({ size = 48 }: { size?: number }) {
  const uid = useId().replace(/[:]/g, "");
  const bg = `bg-${uid}`;
  const page = `pg-${uid}`;
  const ring = `rg-${uid}`;
  return (
    <span
      className="relative grid place-items-center rounded-full shrink-0 select-none"
      style={{
        width: size, height: size,
        boxShadow: "0 0 22px rgba(143,191,154,0.4), 0 4px 14px rgba(0,0,0,0.45)",
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width={size} height={size} className="block">
        <defs>
          <radialGradient id={bg} cx="34%" cy="26%" r="80%">
            <stop offset="0%" stopColor="#3e5b40" />
            <stop offset="55%" stopColor="#20332a" />
            <stop offset="100%" stopColor="#0b1410" />
          </radialGradient>
          <linearGradient id={page} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor="#f6efdf" />
            <stop offset="55%" stopColor="#efe3c4" />
            <stop offset="100%" stopColor="#b9d4b3" />
          </linearGradient>
          <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b9d4b3" />
            <stop offset="50%" stopColor="#f6efdf" />
            <stop offset="100%" stopColor="#4f8a60" />
          </linearGradient>
        </defs>

        {/* circle emblem */}
        <circle cx="32" cy="32" r="30.5" fill={`url(#${bg})`} stroke={`url(#${ring})`} strokeWidth="1.4" />
        <circle cx="32" cy="32" r="27" fill="none" stroke="#8fbf9a" strokeOpacity="0.35" strokeWidth="0.8" />
        <circle cx="32" cy="32" r="24.3" fill="none" stroke="#d9ae5f" strokeOpacity="0.45" strokeWidth="0.7" strokeDasharray="1.1 2.5" strokeLinecap="round" />

        {/* open Mushaf */}
        <path
          d="M32 21.2 C27.4 18.4 21.2 17.7 16.4 19.1 L16.4 41.6 C21.2 40.3 27.4 41 32 43.7 C36.6 41 42.8 40.3 47.6 41.6 L47.6 19.1 C42.8 17.7 36.6 18.4 32 21.2 Z"
          fill={`url(#${page})`}
          stroke="#b9d4b3"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path d="M32 21.2 L32 43.7" stroke="#6b5b35" strokeOpacity="0.55" strokeWidth="1.1" strokeLinecap="round" />
        <g stroke="#6b5b35" strokeOpacity="0.4" strokeWidth="0.9" strokeLinecap="round">
          <path d="M20.2 24.4 h8" /><path d="M20.2 27.8 h8" /><path d="M20.2 31.2 h6.8" /><path d="M20.2 34.6 h8" />
          <path d="M35.8 24.4 h8" /><path d="M35.8 27.8 h8" /><path d="M37 31.2 h6.8" /><path d="M35.8 34.6 h8" />
        </g>
        {/* tiny ayah marker on the page */}
        <circle cx="26.4" cy="38" r="0.9" fill="#6b5b35" fillOpacity="0.45" />
        <circle cx="37.6" cy="38" r="0.9" fill="#6b5b35" fillOpacity="0.45" />

        {/* rehal (book stand) */}
        <path d="M20 44.8 L32 50.2 L44 44.8" fill="none" stroke="#d9ae5f" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        <path d="M24.4 47 L32 50.5 L39.6 47" fill="none" stroke="#d9ae5f" strokeWidth="0.85" strokeOpacity="0.55" strokeLinecap="round" strokeLinejoin="round" />

        {/* golden star */}
        <path d="M49.6 14.2 l1.45 3.05 3.05 1.45 -3.05 1.45 -1.45 3.05 -1.45 -3.05 -3.05 -1.45 3.05 -1.45z" fill="#d9ae5f" />
      </svg>
    </span>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("surahs");
  const [menuOpen, setMenuOpen] = useState(false);

  /* data */
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [recLoading, setRecLoading] = useState(true);
  const [recError, setRecError] = useState(false);
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [surLoading, setSurLoading] = useState(true);
  const [surError, setSurError] = useState(false);

  /* mushaf */
  const [readSurah, setReadSurah] = useLS<number>("ws_read_surah", 1);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [tafsir, setTafsir] = useState<Ayah[]>([]);
  const [mushafLoading, setMushafLoading] = useState(false);
  const [mushafError, setMushafError] = useState(false);
  const [fontSize, setFontSize] = useLS<number>("ws_font", 27);
  const [showTafsir, setShowTafsir] = useState(false);

  /* reciter selection */
  const [selReciterId, setSelReciterId] = useLS<number | null>("ws_sel_reciter", null);
  const [selMoshaf, setSelMoshaf] = useLS<number>("ws_sel_moshaf", 0);

  /* player + offline vault */
  const { online, manualOffline, browserOnline, toggle: toggleConnection } = useConnection();
  const [track, setTrack] = useState<Track | null>(null);
  const [playUrl, setPlayUrl] = useState<string>("");
  const [isCached, setIsCached] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savePct, setSavePct] = useState<number | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [savedTracks, setSavedTracks] = useState<SavedTrack[]>([]);
  const [vaultBytes, setVaultBytes] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplay, setAutoplay] = useLS<boolean>("ws_autoplay", true);
  const [prayerSrc, setPrayerSrc] = useState<"online" | "offline">("online");
  const [lastListened, setLastListened] = useLS<{ surah: number; reciter: string; reciterId: number; moshaf: number } | null>("ws_last_listen", null);

  /* notifications • assistant • salawat */
  const [notifSettings, setNotifSettings] = useLS<NotifSettings>("ws_notif_settings", DEFAULT_NOTIF_SETTINGS);
  const [reminders, setReminders] = useLS<Reminder[]>("ws_reminders", []);
  const [notifOpen, setNotifOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [chat, setChat] = useLS<ChatMessage[]>("ws_chat", []);
  const [aiConfig, setAiConfig] = useLS<AIConfig>("ws_ai_cfg", DEFAULT_AI_CONFIG);
  const [salawat, setSalawat] = useLS<{ count: number; date: string }>("ws_salawat", { count: 0, date: new Date().toDateString() });
  const [gentleIdx, setGentleIdx] = useLS<number>("ws_gentle_idx", 0);
  const [toast, setToast] = useState<{ title: string; body: string; tab?: string } | null>(null);
  const [notifTick, setNotifTick] = useState(0);

  const refreshVault = useCallback(async () => {
    try {
      const list = await listSavedTracks();
      setSavedTracks(list);
      setSavedKeys(new Set(list.map((t) => t.key)));
      const u = await vaultUsage();
      setVaultBytes(u.bytes);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refreshVault(); }, [refreshVault]);

  /* resolve playable URL: cached blob wins over streaming */
  useEffect(() => {
    let alive = true;
    if (!track) {
      setPlayUrl("");
      setIsCached(false);
      setSaveState("idle");
      setSavePct(null);
      return;
    }
    setSaveState("idle");
    setSavePct(null);
    resolveAudioUrl(track.key, track.url)
      .then(({ url, cached }) => {
        if (!alive) return;
        setPlayUrl(url);
        setIsCached(cached);
        if (cached) setSaveState("saved");
        else isTrackSaved(track.key).then((s) => { if (alive && s) { setSaveState("saved"); setIsCached(true); } }).catch(() => {});
      })
      .catch(() => {
        if (!alive) return;
        setPlayUrl(track.url);
        setIsCached(false);
      });
    return () => { alive = false; };
  }, [track]);

  const saveCurrentTrack = useCallback(async () => {
    if (!track || saveState === "saving" || saveState === "saved") return;
    if (!isNetworkAllowed()) {
      setSaveState("error");
      return;
    }
    setSaveState("saving");
    setSavePct(0);
    try {
      await saveTrack(
        track.key,
        { surah: track.surahNumber, surahName: track.surahName, reciter: track.reciterName, reciterId: track.reciterId, moshaf: track.moshafName, moshafId: track.moshafId },
        track.url,
        (loaded, total) => setSavePct(total ? Math.round((loaded / total) * 100) : null)
      );
      const { url, cached } = await resolveAudioUrl(track.key, track.url);
      setPlayUrl(url);
      setIsCached(cached);
      setSaveState("saved");
      refreshVault();
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState((s) => (s === "error" ? "idle" : s)), 2500);
    }
  }, [track, saveState, refreshVault]);

  const saveSurahDirect = useCallback(async (
    reciter: Reciter, moshafIdx: number, surah: number,
    onPct?: (pct: number | null) => void
  ): Promise<boolean> => {
    const m = reciter.moshaf[moshafIdx] ?? reciter.moshaf[0];
    if (!m) return false;
    const key = vaultKey(reciter.id, m.id, surah);
    try {
      await saveTrack(
        key,
        { surah, surahName: plainSurahName(surah), reciter: reciter.name, reciterId: reciter.id, moshaf: m.name, moshafId: m.id },
        surahAudioUrl(m, surah),
        (l, t) => onPct?.(t ? Math.round((l / t) * 100) : null)
      );
      refreshVault();
      return true;
    } catch {
      return false;
    }
  }, [refreshVault]);

  /* favorites */
  const [favSurahsArr, setFavSurahsArr] = useLS<number[]>("ws_fav_surahs", []);
  const [favRecitersArr, setFavRecitersArr] = useLS<number[]>("ws_fav_reciters", []);
  const favSurahs = useMemo(() => new Set(favSurahsArr), [favSurahsArr]);
  const favReciters = useMemo(() => new Set(favRecitersArr), [favRecitersArr]);

  /* adhkar (auto-reset daily) */
  const [adhkarProgress, setAdhkarProgress] = useLS<Record<string, number>>("ws_adhkar_v1", {});
  const [adhkarDay, setAdhkarDay] = useLS<string>("ws_adhkar_day", "");
  useEffect(() => {
    const today = new Date().toDateString();
    if (adhkarDay !== today) {
      if (adhkarDay !== "") setAdhkarProgress({});
      setAdhkarDay(today);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* search */
  const [search, setSearch] = useState("");
  const [surahFilter, setSurahFilter] = useState<"all" | "makki" | "madani">("all");
  const [searchFocus, setSearchFocus] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  /* prayer */
  const [prayer, setPrayer] = useState<PrayerData | null>(null);
  const [prayerLoading, setPrayerLoading] = useState(true);
  const [prayerError, setPrayerError] = useState(false);
  const [city, setCity] = useLS<{ city: string; country: string; label: string }>("ws_city", { city: "Cairo", country: "Egypt", label: "القاهرة" });
  const [usingGeo, setUsingGeo] = useLS<boolean>("ws_geo", false);
  const [locating, setLocating] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  /* ---------- fetchers ---------- */
  const loadReciters = useCallback(async () => {
    setRecLoading(true); setRecError(false);
    try {
      const r = await fetchReciters();
      setReciters(r);
    } catch { setRecError(true); }
    finally { setRecLoading(false); }
  }, []);
  const loadSurahs = useCallback(async () => {
    setSurLoading(true); setSurError(false);
    try {
      const s = await fetchSurahsMeta();
      setSurahs(s);
    } catch { setSurError(true); }
    finally { setSurLoading(false); }
  }, []);

  useEffect(() => { loadReciters(); loadSurahs(); }, [loadReciters, loadSurahs]);

  const loadPrayer = useCallback(async () => {
    setPrayerLoading(true); setPrayerError(false);
    try {
      if (usingGeo) {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) => {
            if (!navigator.geolocation) throw new Error("no-geo");
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 9000 });
          });
          const d = await fetchPrayerByCoords(pos.coords.latitude, pos.coords.longitude);
          setPrayer(d);
          setPrayerSrc(getPrayerSource());
        } catch {
          // geo denied or offline → last city calculated on-device
          const d = await fetchPrayerByCity(city.city, city.country);
          setPrayer(d);
          setPrayerSrc(getPrayerSource());
        }
      } else {
        const d = await fetchPrayerByCity(city.city, city.country);
        setPrayer(d);
        setPrayerSrc(getPrayerSource());
      }
    } catch {
      setPrayerError(true);
    } finally { setPrayerLoading(false); }
  }, [city, usingGeo]);

  useEffect(() => { loadPrayer(); }, [loadPrayer]);

  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const d = await fetchPrayerByCoords(pos.coords.latitude, pos.coords.longitude);
          setPrayer(d); setUsingGeo(true); setPrayerError(false);
        } catch { setPrayerError(true); }
        finally { setLocating(false); }
      },
      () => setLocating(false),
      { timeout: 10000 }
    );
  };

  /* mushaf text */
  const loadMushaf = useCallback(async (n: number) => {
    setMushafLoading(true); setMushafError(false);
    try {
      const [t, f] = await Promise.all([fetchSurahText(n), fetchSurahTafsir(n)]);
      setAyahs(t); setTafsir(f);
    } catch { setMushafError(true); }
    finally { setMushafLoading(false); }
  }, []);
  useEffect(() => { loadMushaf(readSurah); }, [readSurah, loadMushaf]);

  /* sorted + default reciter */
  const sortedReciters = useMemo(() => (reciters.length ? sortReciters(reciters) : []), [reciters]);
  const selectedReciter: Reciter | null = useMemo(() => {
    if (!sortedReciters.length) return null;
    const found = sortedReciters.find((r) => r.id === selReciterId);
    return found || sortedReciters[0];
  }, [sortedReciters, selReciterId]);

  const surahNameOf = useCallback((n: number) => {
    const s = surahs.find((x) => x.number === n);
    return s ? s.name : `سورة ${n}`;
  }, [surahs]);

  /* autoplay: when a surah ends, the next one opens automatically in the reading view */
  const autoAdvanceRef = useRef(false);
  useEffect(() => {
    if (!track || !autoAdvanceRef.current) return;
    autoAdvanceRef.current = false;
    if (autoplay) {
      setReadSurah(track.surahNumber);
      setToast({
        title: `▶️ سورة ${track.surahName} — تلقائياً`,
        body: `${track.reciterName} • انتهت السورة السابقة وبدأت التالية`,
        tab: "mushaf",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.key, autoplay]);

  /* playing state sync */
  useEffect(() => {
    const a = getAudio();
    const onP = () => setIsPlaying(true);
    const onPa = () => setIsPlaying(false);
    a.addEventListener("play", onP);
    a.addEventListener("pause", onPa);
    return () => { a.removeEventListener("play", onP); a.removeEventListener("pause", onPa); };
  }, []);

  /* close search on outside */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocus(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* PWA shortcut deep-link (?tab=...) */
  useEffect(() => {
    const t = consumeLaunchTab();
    if (t) setTab(t as Tab);
  }, []);

  /* native shell: Android back button navigates inside the app */
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const searchRef2 = useRef(search);
  searchRef2.current = search;
  const menuRef = useRef(menuOpen);
  menuRef.current = menuOpen;
  useEffect(() => {
    initNative(() => {
      if (menuRef.current) { setMenuOpen(false); return true; }
      if (searchRef2.current) { setSearch(""); return true; }
      if (tabRef.current !== "surahs") { setTab("surahs"); return true; }
      return false;
    });
  }, []);

  /* ---------- playback (vault-aware) ---------- */
  const playSurahWith = useCallback((reciter: Reciter, moshafIdx: number, surah: number) => {
    const m = reciter.moshaf[moshafIdx] ?? reciter.moshaf[0];
    if (!m) return;
    const url = surahAudioUrl(m, surah);
    if (!url) return; // surah not available for this reciter — never set a broken track
    const meta = surahs.find((s) => s.number === surah);
    setTrack({
      surahNumber: surah,
      surahName: meta?.name || plainSurahName(surah),
      reciterName: reciter.name,
      reciterId: reciter.id,
      moshafName: m.name,
      moshafId: m.id,
      url,
      key: vaultKey(reciter.id, m.id, surah),
    });
    setLastListened({ surah, reciter: reciter.name, reciterId: reciter.id, moshaf: moshafIdx });
  }, [surahs, setLastListened]);

  const playSavedTrack = useCallback((t: SavedTrack) => {
    const rec = reciters.find((r) => r.id === t.reciterId);
    if (rec) {
      const mi = rec.moshaf.findIndex((m) => m.id === t.moshafId);
      playSurahWith(rec, mi >= 0 ? mi : 0, t.surah);
    } else {
      // reciter meta missing (shouldn't happen offline) — play blob directly
      setTrack({
        surahNumber: t.surah,
        surahName: t.surahName,
        reciterName: t.reciter,
        reciterId: t.reciterId,
        moshafName: t.moshaf,
        moshafId: t.moshafId,
        url: "",
        key: t.key,
      });
    }
  }, [reciters, playSurahWith]);

  const currentQueue: number[] = useMemo(() => {
    if (selectedReciter) {
      const m = selectedReciter.moshaf[selMoshaf] ?? selectedReciter.moshaf[0];
      if (m) {
        const list = parseSurahList(m.surah_list);
        if (list.length) return list;
      }
    }
    return Array.from({ length: 114 }, (_, i) => i + 1);
  }, [selectedReciter, selMoshaf]);

  const playDefault = useCallback((surah: number) => {
    const hasSurah = (r: Reciter, mi: number) => {
      const m = r.moshaf[mi];
      if (!m) return false;
      if (!parseSurahList(m.surah_list).includes(surah)) return false;
      return surahAudioUrl(m, surah) !== "";
    };
    let r = selectedReciter || sortedReciters[0];
    if (!r) return;
    // find first moshaf containing the surah (featured reciters may cover a subset)
    let idx = r.moshaf.findIndex((_, i) => hasSurah(r!, i));
    if (idx < 0) {
      // selected reciter lacks this surah → first reciter that has it
      const alt = sortedReciters.find((x) => x.moshaf.some((_, i) => hasSurah(x, i)));
      if (!alt) return;
      r = alt;
      idx = r.moshaf.findIndex((_, i) => hasSurah(r!, i));
    }
    playSurahWith(r, idx, surah);
  }, [selectedReciter, sortedReciters, playSurahWith]);

  const stepTrack = useCallback((dir: 1 | -1) => {
    if (!track) return;
    // try to keep same reciter/moshaf if possible
    const rec = sortedReciters.find((r) => r.name === track.reciterName) || selectedReciter;
    let list = currentQueue;
    if (rec) {
      const mi = rec.moshaf.findIndex((m) => m.name === track.moshafName);
      const m = rec.moshaf[mi >= 0 ? mi : 0];
      const parsed = parseSurahList(m.surah_list);
      if (parsed.length) list = parsed;
    }
    const i = list.indexOf(track.surahNumber);
    const nextSurah = i >= 0 ? list[(i + dir + list.length) % list.length] : track.surahNumber + dir;
    const clamped = Math.min(114, Math.max(1, nextSurah));
    if (rec) {
      const mi = rec.moshaf.findIndex((m) => m.name === track.moshafName);
      playSurahWith(rec, mi >= 0 ? mi : 0, clamped);
    } else playDefault(clamped);
  }, [track, currentQueue, sortedReciters, selectedReciter, playSurahWith, playDefault]);

  const handleEnded = useCallback(() => { autoAdvanceRef.current = true; stepTrack(1); }, [stepTrack]);

  /* ================= مُسلم + الإشعارات ================= */
  const addSalawat = useCallback(() => {
    setSalawat((prev) => {
      const today = new Date().toDateString();
      const base = prev.date === today ? prev.count : 0;
      return { count: base + 1, date: today };
    });
  }, [setSalawat]);

  useEffect(() => {
    if (salawat.date !== new Date().toDateString()) setSalawat({ count: 0, date: new Date().toDateString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureNotifications = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") {
      if (!notifSettings.enabled) setNotifSettings({ ...notifSettings, enabled: true });
      return true;
    }
    const ok = await requestNotificationPermission();
    setNotifSettings({ ...notifSettings, enabled: ok });
    return ok;
  }, [notifSettings, setNotifSettings]);

  const addReminderFromAssistant = useCallback((title: string, body: string, dueAt: number, repeat: "once" | "daily" | "weekly"): boolean => {
    const r = makeReminder({ title, body, dueAt, repeat, type: "custom" });
    setReminders((prev) => [...prev, r].sort((a, b) => a.dueAt - b.dueAt));
    const granted = typeof Notification !== "undefined" && Notification.permission === "granted";
    if (!granted) void ensureNotifications();
    else if (!notifSettings.enabled) setNotifSettings({ ...notifSettings, enabled: true });
    void granted;
    return true;
  }, [setReminders, ensureNotifications, notifSettings.enabled]);

  /* rebuild automatic reminders when settings / prayer times change */
  const timingsKey = prayer ? Object.values(prayer.timings).join("|") : "";
  useEffect(() => {
    if (!notifSettings.enabled) {
      setReminders((prev) => prev.filter((r) => !r.auto));
      return;
    }
    const fresh = buildAutoReminders(notifSettings, prayer ? { ...prayer.timings } : null);
    setReminders((prev) => mergeAutoReminders(prev, fresh));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifSettings, timingsKey]);

  /* reminder scheduler */
  const remindersRef = useRef(reminders);
  remindersRef.current = reminders;
  const bootRef = useRef(false);
  useEffect(() => {
    const tick = () => {
      const { fired, next } = processDue(remindersRef.current);
      const now = Date.now();
      const extras: Reminder[] = [];
      if (fired.length) {
        for (const f of fired) {
          const tab = f.type === "prayer" ? "prayer" : f.type === "adhkar" || f.type === "salawat" ? "adhkar" : "mushaf";
          if (bootRef.current) {
            void showNotification({ title: f.title, body: f.body, tab, tag: f.id });
            setToast({ title: f.title, body: f.body, tab });
            if (f.type === "salawat") {
              const c = salawatReminderContent(salawat.count);
              extras.push(makeReminder({ title: c.title, body: c.body, dueAt: now + notifSettings.salawatEveryMin * 60000, repeat: "once", type: "salawat", auto: true }));
            }
            if (f.type === "gentle") {
              const n = GENTLE_NUDGES[gentleIdx % GENTLE_NUDGES.length];
              setGentleIdx(gentleIdx + 1);
              extras.push(makeReminder({ title: n.title, body: n.body, dueAt: now + notifSettings.gentleEveryMin * 60000, repeat: "once", type: "gentle", auto: true }));
            }
          }
        }
      }
      const merged = [...next.filter((r) => !(r.auto && r.dueAt <= now)), ...extras].sort((a, b) => a.dueAt - b.dueAt);
      const sig = (arr: Reminder[]) => arr.map((r) => `${r.id}:${r.dueAt}:${r.enabled ? 1 : 0}`).join("|");
      if (sig(merged) !== sig(remindersRef.current)) setReminders(merged);
      if (fired.length) setNotifTick((t) => t + 1);
    };
    // silent catch-up on first run, then notify
    tick();
    bootRef.current = true;
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifSettings, gentleIdx, salawat.count]);

  /* assistant actions */
  const pickReciterFor = useCallback((surah: number, preferredId?: number): { reciter: Reciter; idx: number } | null => {
    const usable = (r: Reciter, i: number) => {
      const m = r.moshaf[i];
      return !!m && parseSurahList(m.surah_list).includes(surah) && surahAudioUrl(m, surah) !== "";
    };
    if (preferredId) {
      const r = reciters.find((x) => x.id === preferredId);
      if (r) {
        const i = r.moshaf.findIndex((_, k) => usable(r, k));
        if (i >= 0) return { reciter: r, idx: i };
      }
    }
    if (selectedReciter) {
      const i = selectedReciter.moshaf.findIndex((_, k) => usable(selectedReciter, k));
      if (i >= 0) return { reciter: selectedReciter, idx: i };
    }
    const alt = sortedReciters.find((x) => x.moshaf.some((_, k) => usable(x, k)));
    if (!alt) return null;
    return { reciter: alt, idx: alt.moshaf.findIndex((_, k) => usable(alt, k)) };
  }, [reciters, selectedReciter, sortedReciters]);

  const runAssistantAction = useCallback((a: AssistantAction) => {
    switch (a.kind) {
      case "tab":
        setTab(a.tab);
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
      case "play": {
        const picked = pickReciterFor(a.surah, a.reciterId);
        if (picked) {
          setSelReciterId(picked.reciter.id);
          playSurahWith(picked.reciter, picked.idx, a.surah);
        }
        break;
      }
      case "read":
        setReadSurah(a.surah);
        setShowTafsir(!!a.tafsir);
        setTab("mushaf");
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
      case "favorite":
        toggleFavSurah(a.surah);
        break;
      case "search":
        setSearch(a.query);
        setSurahFilter("all");
        setTab("reciters");
        break;
      case "download": {
        const picked = pickReciterFor(a.surah);
        if (picked) void saveSurahDirect(picked.reciter, picked.idx, a.surah);
        break;
      }
      case "notifications":
        if (a.enabled) void ensureNotifications();
        else setNotifSettings({ ...notifSettings, enabled: false });
        break;
      case "salawat":
        addSalawat();
        break;
      default:
        break;
    }
  }, [pickReciterFor, playSurahWith, setReadSurah, setShowTafsir, setSelReciterId, saveSurahDirect, setNotifSettings, notifSettings, addSalawat]);

  const adhkarAll = useMemo(() => [...morningAdhkar, ...eveningAdhkar], []);
  const adhkarDone = useMemo(
    () => adhkarAll.filter((d) => (adhkarProgress[d.id] ?? d.count) <= 0).length,
    [adhkarAll, adhkarProgress]
  );
  const fastingCards = useMemo(() => {
    if (!prayer) return [];
    return upcomingFasting(parseInt(prayer.hijri.day, 10) || 1, prayer.hijri.month.number || 1, prayer.hijri.weekday.en);
  }, [prayer]);

  const assistantCtx: AssistantContext = useMemo(() => ({
    surahs,
    reciters: sortedReciters,
    prayer,
    selectedReciterName: selectedReciter?.name ?? null,
    favSurahs: favSurahsArr,
    salawatCount: salawat.count,
    adhkarDone,
    adhkarTotal: adhkarAll.length,
    savedCount: savedTracks.length,
    cityLabel: usingGeo ? "موقعك الحالي" : city.label,
    fasting: fastingCards.map((f) => ({ title: f.title, when: f.when, daysLeft: f.daysLeft, virtue: f.virtue })),
  }), [surahs, sortedReciters, prayer, selectedReciter, favSurahsArr, salawat.count, adhkarDone, adhkarAll.length, savedTracks.length, usingGeo, city.label, fastingCards]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (notifSettings.enabled) void syncNativeNotifications(reminders, notifSettings);
      else void cancelAllNative();
    }, 1200);
    return () => clearTimeout(id);
  }, [reminders, notifSettings]);

  const pendingReminders = useMemo(
    () => reminders.filter((r) => r.enabled && r.dueAt > Date.now()).length,
    [reminders, notifTick]
  );

  const toggleFavSurah = (n: number) => {
    setFavSurahsArr((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };
  const toggleFavReciter = (id: number) => {
    setFavRecitersArr((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openRead = (n: number) => {
    setReadSurah(n);
    setTab("mushaf");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* fasting alerts */
  const alerts = useMemo(() => {
    if (!prayer) return [];
    const d = parseInt(prayer.hijri.day, 10);
    const mo = prayer.hijri.month.number;
    if (!d || !mo) return [];
    return getFastingAlerts(d, mo, prayer.hijri.weekday.en);
  }, [prayer]);

  /* global search results */
  const searchResults = useMemo(() => {
    const q = search.trim();
    if (q.length < 1) return { surahs: [] as SurahMeta[], reciters: [] as Reciter[] };
    const num = parseInt(q.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString()), 10);
    return {
      surahs: surahs.filter((s) => s.name.includes(q) || normAr(s.name).includes(normAr(q)) || (!isNaN(num) && s.number === num)).slice(0, 6),
      reciters: sortedReciters.filter((r) => normAr(r.name).includes(normAr(q))).slice(0, 6),
    };
  }, [search, surahs, sortedReciters]);

  const favSurahMetas = useMemo(
    () => favSurahsArr.map((n) => surahs.find((s) => s.number === n)).filter(Boolean) as SurahMeta[],
    [favSurahsArr, surahs]
  );
  const favReciterObjs = useMemo(
    () => favRecitersArr.map((id) => reciters.find((r) => r.id === id)).filter(Boolean) as Reciter[],
    [favRecitersArr, reciters]
  );

  const playingSurah = track?.surahNumber ?? null;
  const playingReciterId = useMemo(() => {
    if (!track) return null;
    const f = reciters.find((r) => r.name === track.reciterName);
    return f ? f.id : (selectedReciter?.id ?? null);
  }, [track, reciters, selectedReciter]);

  return (
    <div className="min-h-screen bg-stage relative" dir="rtl">
      <div className="fixed inset-0 islamic-pattern pointer-events-none z-0" />
      <div className="orb fixed top-[-120px] right-[-80px] w-[420px] h-[420px] rounded-full bg-teal-500/[0.09] z-0" />
      <div className="orb fixed bottom-[10%] left-[-120px] w-[380px] h-[380px] rounded-full bg-teal-700/[0.12] z-0" style={{ animationDelay: "-6s" }} />

      {/* ===== Header ===== */}
      <header className="sticky top-0 z-50 border-b border-teal-300/15 bg-[#0b1410]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-5">
          <div className="flex items-center gap-3 py-3">
            <BrandEmblem />
            <div className="min-w-0">
              <h1 className="font-ruqaa text-[26px] sm:text-[32px] leading-none brand-gradient font-bold whitespace-nowrap">وِرْد</h1>
              <p className="text-[11px] sm:text-[12px] text-teal-100/55 font-tajawal mt-1 truncate">منصة القرآن الكريم • استمع • اقرأ • تدبّر</p>
            </div>
            <div className="flex-1" />
            <BellButton count={pendingReminders} onClick={() => setNotifOpen(true)} />
            {/* متصل / غير متصل — manual switch */}
            <button
              onClick={toggleConnection}
              role="switch"
              aria-checked={online}
              title={online ? "متصل بالإنترنت — اضغط للتحويل إلى غير متصل" : "غير متصل — البيانات المحلية تعمل. اضغط للاتصال"}
              className={cn(
                "inline-flex items-center gap-1.5 sm:gap-2 h-9 ps-2.5 pe-1.5 rounded-full border font-bold whitespace-nowrap active:scale-95 transition-all",
                online
                  ? "bg-emerald-400/10 border-emerald-300/35 text-emerald-200 hover:bg-emerald-400/15 shadow-[0_0_14px_rgba(52,211,153,0.18)]"
                  : "bg-amber-300/10 border-amber-200/45 text-amber-100 hover:bg-amber-300/15 shadow-[0_0_14px_rgba(217,174,95,0.25)]"
              )}
            >
              {online ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span className="text-[11.5px] hidden sm:inline">{online ? "متصل" : "غير متصل"}</span>
              <span
                className={cn(
                  "flex items-center w-8 h-4 rounded-full px-0.5 transition-colors",
                  online ? "bg-emerald-400/45" : "bg-amber-300/40"
                )}
              >
                <span
                  className="w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200"
                  style={{ transform: online ? "translateX(0)" : "translateX(-16px)" }}
                />
              </span>
              {!online && savedTracks.length > 0 && (
                <span className="hidden lg:inline opacity-75 text-[11px]">• {savedTracks.length} محفوظة</span>
              )}
            </button>
            {/* desktop search */}
            <div ref={searchRef} className="relative hidden md:block w-[340px]">
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-teal-200/50" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocus(true)}
                placeholder="ابحث عن سورة أو قارئ..."
                className="w-full h-11 rounded-2xl bg-black/30 border border-teal-300/20 focus:border-teal-300/60 outline-none pr-10 pl-9 text-[13.5px] text-teal-50 placeholder:text-teal-100/30 transition-all focus:shadow-[0_0_20px_rgba(143,191,154,0.15)]"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-100 active:scale-90 transition-all">
                  <X size={15} />
                </button>
              )}
              {/* dropdown */}
              <AnimatePresence>
                {searchFocus && search.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute top-full mt-2 inset-x-0 glass-strong rounded-2xl overflow-hidden shadow-2xl max-h-[380px] overflow-y-auto"
                  >
                    {searchResults.surahs.length === 0 && searchResults.reciters.length === 0 ? (
                      <p className="p-4 text-center text-[13px] text-teal-100/50 font-tajawal">لا توجد نتائج</p>
                    ) : (
                      <>
                        {searchResults.surahs.length > 0 && (
                          <div className="p-2">
                            <p className="px-2 py-1 text-[11px] font-bold text-teal-200/60">السور</p>
                            {searchResults.surahs.map((s) => (
                              <button
                                key={s.number}
                                onClick={() => { setSearch(""); setSearchFocus(false); setSurahFilter("all"); playDefault(s.number); }}
                                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-teal-400/10 text-right active:scale-[0.99] transition-all"
                              >
                                <span className="w-8 h-8 grid place-items-center rounded-lg bg-teal-400/10 border border-teal-300/25 text-[12px] font-bold text-teal-100">{s.number}</span>
                                <span className="font-quran text-[15px] text-teal-50">سورة {s.name}</span>
                                <Play size={13} className="ms-auto text-teal-300/60" />
                              </button>
                            ))}
                          </div>
                        )}
                        {searchResults.reciters.length > 0 && (
                          <div className="p-2 border-t border-teal-300/10">
                            <p className="px-2 py-1 text-[11px] font-bold text-teal-200/60">القراء</p>
                            {searchResults.reciters.map((r) => (
                              <button
                                key={r.id}
                                onClick={() => { setSelReciterId(r.id); setSelMoshaf(0); setSearch(""); setSearchFocus(false); setTab("reciters"); }}
                                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-teal-400/10 text-right active:scale-[0.99] transition-all"
                              >
                                <span className="w-8 h-8 grid place-items-center rounded-lg bg-teal-400/10 border border-teal-300/25 font-quran text-teal-100">{r.name.slice(0, 1)}</span>
                                <span className="font-amiri font-bold text-[14px] text-teal-50 truncate">{r.name}</span>
                                <ChevronLeft size={14} className="ms-auto text-teal-300/60" />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* mobile menu */}
            <button onClick={() => setMenuOpen((v) => !v)} className="md:hidden w-10 h-10 grid place-items-center rounded-xl border border-teal-300/25 text-teal-100 active:scale-90 transition-all" aria-label="القائمة">
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>

          {/* mobile search */}
          <div className="md:hidden pb-3">
            <div className="relative">
              <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-teal-200/50" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن سورة أو قارئ..."
                className="w-full h-10 rounded-xl bg-black/30 border border-teal-300/20 focus:border-teal-300/60 outline-none pr-10 pl-4 text-[13px] text-teal-50 placeholder:text-teal-100/30"
              />
            </div>
            {search.trim() && (
              <div className="mt-2 glass rounded-xl p-2 max-h-[220px] overflow-y-auto">
                {searchResults.surahs.map((s) => (
                  <button key={s.number} onClick={() => { setSearch(""); playDefault(s.number); }} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-teal-400/10 text-right">
                    <span className="font-quran text-teal-50">سورة {s.name}</span>
                    <Play size={12} className="ms-auto text-teal-300" />
                  </button>
                ))}
                {searchResults.reciters.map((r) => (
                  <button key={r.id} onClick={() => { setSelReciterId(r.id); setSearch(""); setTab("reciters"); }} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-teal-400/10 text-right">
                    <span className="font-amiri font-bold text-teal-50">{r.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* desktop tabs */}
          <nav className="hidden md:flex items-center gap-1.5 pb-3 overflow-x-auto no-scrollbar">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "relative h-10 px-4 rounded-xl text-[13.5px] font-bold flex items-center gap-2 whitespace-nowrap active:scale-95 transition-all duration-200",
                  tab === id ? "text-[#16221a]" : "text-teal-100/65 hover:text-teal-50 hover:bg-white/[0.04]"
                )}
              >
                {tab === id && (
                  <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-xl bg-gradient-to-l from-teal-300 to-teal-500 shadow-[0_0_20px_rgba(143,191,154,0.45)]" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                )}
                <Icon size={16} className="relative" />
                <span className="relative">{label}</span>
                {id === "favs" && (favSurahsArr.length + favRecitersArr.length) > 0 && (
                  <span className={cn("relative min-w-5 h-5 px-1 rounded-full grid place-items-center text-[11px] font-bold", tab === id ? "bg-black/25 text-[#16221a]" : "bg-teal-400/20 text-teal-100")}>
                    {favSurahsArr.length + favRecitersArr.length}
                  </span>
                )}
              </button>
            ))}
            <div className="flex-1" />
            {prayer && (
              <span className="hidden lg:flex items-center gap-1.5 text-[12px] font-bold text-teal-100/60 whitespace-nowrap">
                <Moon size={13} className="text-amber-200" />
                {prayer.hijri.day} {prayer.hijri.month.ar} {prayer.hijri.year}هـ
              </span>
            )}
          </nav>
        </div>

        {/* mobile tabs dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden border-t border-teal-300/10"
            >
              <div className="grid grid-cols-3 gap-2 p-3">
                {TABS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => { setTab(id); setMenuOpen(false); }}
                    className={cn(
                      "h-11 rounded-xl text-[12.5px] font-bold flex flex-col items-center justify-center gap-1 border active:scale-95 transition-all",
                      tab === id ? "bg-gradient-to-br from-teal-400 to-teal-600 text-[#16221a] border-transparent" : "bg-white/[0.03] border-teal-300/15 text-teal-100/75"
                    )}
                  >
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* ===== Offline + Fasting banners ===== */}
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-5">
        <AnimatePresence>
          {!online && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mt-4 rounded-2xl border border-teal-300/30 bg-gradient-to-l from-teal-400/[0.12] via-emerald-400/[0.06] to-teal-400/[0.08] p-3.5 flex items-start gap-3"
            >
              <span className="shrink-0 w-10 h-10 rounded-xl grid place-items-center bg-teal-400/15 border border-teal-300/30 text-teal-200">
                <WifiOff size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-amiri font-bold text-[15px] text-teal-50">
                  {manualOffline ? "وضع «غير متصل» مُفعَّل يدوياً — كل شيء يعمل" : "لا يوجد اتصال بالإنترنت — كل شيء يعمل"}
                </p>
                <p className="text-[12.5px] text-teal-50/70 font-tajawal mt-0.5">
                  المصحف كاملاً (6236 آية) والتفسير الميسر والمواقيت والتاريخ الهجري تعمل من داخل التطبيق بدون إنترنت
                  {savedTracks.length > 0 ? ` • لديك ${savedTracks.length} سورة صوتية محفوظة (${formatBytes(vaultBytes)})` : " • حمّل السور المفضلة أثناء الاتصال لتستمع إليها هنا بدون نت"}
                  {manualOffline && browserOnline && " • اضغط زر «غير متصل» بالأعلى للعودة للاتصال"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {alerts.length > 0 && !bannerDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mt-4 rounded-2xl border border-amber-200/30 bg-gradient-to-l from-amber-300/[0.12] via-teal-400/[0.07] to-amber-300/[0.08] p-3.5 flex items-start gap-3 shadow-[0_0_30px_rgba(217,174,95,0.08)]"
            >
              <span className="shrink-0 w-10 h-10 rounded-xl grid place-items-center bg-amber-300/15 border border-amber-200/30 text-amber-200 pulse-gold">
                <BellRing size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-amiri font-bold text-[15px] text-amber-50">{alerts[0].title}</p>
                <p className="text-[12.5px] text-teal-50/70 font-tajawal mt-0.5">{alerts[0].detail}</p>
                {alerts.length > 1 && (
                  <p className="text-[12px] text-amber-100/70 font-bold mt-1">+ {alerts.length - 1} تنبيه آخر — شاهد قسم مواقيت الصلاة</p>
                )}
              </div>
              <button onClick={() => setBannerDismissed(true)} className="shrink-0 w-8 h-8 grid place-items-center rounded-lg text-teal-100/50 hover:text-teal-50 hover:bg-white/5 active:scale-90 transition-all" aria-label="إغلاق">
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* last listened / read */}
        {(lastListened || readSurah) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {lastListened && (
              <button
                onClick={() => {
                  const r = reciters.find((x) => x.id === lastListened.reciterId) || selectedReciter;
                  if (r) playSurahWith(r, lastListened.moshaf, lastListened.surah);
                  else playDefault(lastListened.surah);
                }}
                className="flex items-center gap-2 h-10 px-3.5 rounded-xl glass text-[12.5px] font-bold text-teal-100 hover:border-teal-300/50 active:scale-[0.98] transition-all"
              >
                <History size={14} className="text-teal-300" />
                متابعة من حيث توقفت: سورة {surahNameOf(lastListened.surah)}
                <span className="text-teal-100/50 font-normal">• {lastListened.reciter}</span>
                <Play size={13} className="text-teal-300" fill="currentColor" />
              </button>
            )}
            <button
              onClick={() => openRead(readSurah)}
              className="flex items-center gap-2 h-10 px-3.5 rounded-xl glass text-[12.5px] font-bold text-teal-100 hover:border-teal-300/50 active:scale-[0.98] transition-all"
            >
              <BookOpenText size={14} className="text-teal-300" />
              آخر قراءة: سورة {surahNameOf(readSurah)}
            </button>
          </div>
        )}
      </div>

      {/* ===== Main ===== */}
      <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-5 pt-5 pb-40">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28 }}
          >
            {tab === "surahs" && (
              <div>
                <SectionHead title="فهرس السور الكريمة" subtitle="جميع سور القرآن الكريم — 114 سورة — استمع بأي قارئ أو اقرأ بالرسم العثماني مع التفسير" icon={<BookOpen size={20} />} />
                <Surahs
                  surahs={surahs} loading={surLoading} error={surError} onRetry={loadSurahs}
                  search={search} setSearch={setSearch} filter={surahFilter} setFilter={setSurahFilter}
                  favSurahs={favSurahs} onToggleFav={toggleFavSurah}
                  onPlay={playDefault} onRead={openRead}
                  playingSurah={playingSurah} isPlaying={isPlaying}
                />
              </div>
            )}

            {tab === "reciters" && (
              <div>
                <SectionHead title="جميع قراء مصر والعالم العربي" subtitle="نخبة دولة التلاوة المصرية وعمالقة القراء العرب — اختر القارئ والرواية واستمع لأي سورة فوراً" icon={<Mic2 size={20} />} />
                <Reciters
                  reciters={reciters} loading={recLoading} error={recError} onRetry={loadReciters}
                  search={search}
                  favReciters={favReciters} onToggleFav={toggleFavReciter}
                  selectedReciter={selectedReciter}
                  setSelectedReciter={(r) => setSelReciterId(r.id)}
                  selectedMoshafIdx={selMoshaf} setSelectedMoshafIdx={setSelMoshaf}
                  onPlaySurah={playSurahWith}
                  playingReciterId={playingReciterId} playingSurah={playingSurah} isPlaying={isPlaying}
                  surahNameOf={surahNameOf}
                  savedKeys={savedKeys} online={online} onSaveSurah={saveSurahDirect}
                />
              </div>
            )}

            {tab === "mushaf" && (
              <div>
                <SectionHead title="المصحف الشريف والتفسير الميسر" subtitle="اضغط على أي آية لعرض تفسيرها — مع التحكم في حجم الخط والاستماع أثناء القراءة" icon={<BookOpenText size={20} />} />
                <Mushaf
                  surahs={surahs} surahNumber={readSurah} setSurahNumber={setReadSurah}
                  ayahs={ayahs} tafsir={tafsir} loading={mushafLoading || surLoading} error={mushafError} onRetry={() => loadMushaf(readSurah)}
                  fontSize={fontSize} setFontSize={setFontSize}
                  showTafsir={showTafsir} setShowTafsir={setShowTafsir}
                  onPlaySurah={playDefault} playingSurah={playingSurah} isPlaying={isPlaying}
                />
              </div>
            )}

            {tab === "adhkar" && (
              <div>
                <SectionHead title="أذكار الصباح والمساء" subtitle="اضغط على البطاقة لترديد الذكر — يكتمل العدّ تلقائياً مع حفظ تقدمك اليومي" icon={<Sparkles size={20} />} />
                <Adhkar progress={adhkarProgress} onProgress={setAdhkarProgress} />
              </div>
            )}

            {tab === "prayer" && (
              <div>
                <SectionHead title="مواقيت الصلاة وأيام الصيام" subtitle="مواقيت دقيقة بالتوقيت المحلي مع العدّ التنازلي للصلاة القادمة والتقويم الهجري" icon={<MoonStar size={20} />} />
                {prayer && prayerSrc === "offline" && (
                  <div className="mb-3 rounded-xl border border-amber-200/30 bg-amber-300/[0.07] px-4 py-2.5 flex items-center gap-2 text-[12.5px] font-bold text-amber-100">
                    <Satellite size={15} className="text-amber-200 shrink-0" />
                    تعذّر الوصول لخدمة المواقيت — تُعرض الآن حسابات فلكية دقيقة من داخل التطبيق (الطريقة المصرية) والتاريخ الهجري من تقويم جهازك
                  </div>
                )}
                <Prayer
                  prayer={prayer} loading={prayerLoading} error={prayerError} onRetry={loadPrayer}
                  city={city} setCity={(c) => { setCity(c); setUsingGeo(false); }}
                  onLocate={locate} locating={locating} usingGeo={usingGeo}
                />
              </div>
            )}

            {tab === "favs" && (
              <div>
                <SectionHead title="المفضلة" subtitle="سورك وقرّاؤك المحفوظون — متاحون دائماً حتى بعد إغلاق التطبيق" icon={<Heart size={20} />} />
                {/* offline vault */}
                <div className="glass rounded-2xl p-4 mb-5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="w-10 h-10 rounded-2xl grid place-items-center bg-emerald-400/12 border border-emerald-300/30 text-emerald-200">
                      <HardDrive size={18} />
                    </span>
                    <div className="flex-1 min-w-[160px]">
                      <h3 className="font-amiri font-bold text-[16px] text-[#f6efdf]">صوتيات محفوظة بدون نت ({savedTracks.length})</h3>
                      <p className="text-[11.5px] text-teal-100/55 font-tajawal mt-0.5">
                        {savedTracks.length > 0
                          ? `تُشغّل بدون إنترنت نهائياً • المساحة المستخدمة ${formatBytes(vaultBytes)}`
                          : "حمّل سورك المفضلة أثناء الاتصال بالإنترنت لتستمع إليها في أي وقت بدون نت"}
                      </p>
                    </div>
                    {savedTracks.length > 0 && (
                      <button
                        onClick={async () => { await clearVault(); refreshVault(); }}
                        className="h-9 px-3.5 rounded-xl border border-rose-300/30 text-rose-200 text-[12px] font-bold hover:bg-rose-400/10 flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        <Trash2 size={14} /> مسح الكل
                      </button>
                    )}
                  </div>
                  {savedTracks.length > 0 && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3.5 max-h-[320px] overflow-y-auto">
                      {savedTracks.map((t) => (
                        <div key={t.key} className="rounded-xl border border-emerald-300/25 bg-emerald-400/[0.06] p-3 flex items-center gap-2.5">
                          <span className="w-9 h-9 shrink-0 grid place-items-center rounded-lg bg-emerald-400/15 border border-emerald-300/30 text-[12px] font-bold text-emerald-100 tabular-nums">{t.surah}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-quran text-[14.5px] text-[#f6efdf] truncate">سورة {t.surahName}</p>
                            <p className="text-[10.5px] text-teal-100/55 font-tajawal truncate">{t.reciter}</p>
                          </div>
                          <button onClick={() => playSavedTrack(t)} className="w-8 h-8 shrink-0 grid place-items-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-[#16221a] active:scale-90 transition-all" aria-label="تشغيل بدون نت">
                            <Play size={13} fill="currentColor" />
                          </button>
                          <button
                            onClick={async () => { await removeTrack(t.key); refreshVault(); }}
                            className="w-8 h-8 shrink-0 grid place-items-center rounded-full border border-white/10 text-slate-400 hover:text-rose-300 hover:border-rose-300/40 active:scale-90 transition-all"
                            aria-label="حذف"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {favSurahMetas.length === 0 && favReciterObjs.length === 0 && savedTracks.length === 0 ? (
                  <div className="glass rounded-3xl p-12 text-center">
                    <Heart size={44} className="mx-auto text-teal-300/30 mb-4" />
                    <p className="font-ruqaa text-2xl text-teal-50">لا توجد مفضلات بعد</p>
                    <p className="text-[13px] text-teal-100/55 font-tajawal mt-2">اضغط على القلب بجانب أي سورة أو قارئ لحفظه هنا</p>
                    <div className="mt-5 flex justify-center gap-2">
                      <button onClick={() => setTab("surahs")} className="h-10 px-5 rounded-xl bg-gradient-to-l from-teal-400 to-teal-600 text-[#16221a] text-[13px] font-bold active:scale-95 transition-all">تصفح السور</button>
                      <button onClick={() => setTab("reciters")} className="h-10 px-5 rounded-xl border border-teal-300/30 text-teal-100 text-[13px] font-bold active:scale-95 transition-all">تصفح القراء</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {favSurahMetas.length > 0 && (
                      <div>
                        <h3 className="font-amiri font-bold text-[17px] text-teal-50 mb-3">السور المفضلة ({favSurahMetas.length})</h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {favSurahMetas.map((s) => (
                            <div key={s.number} className="glass rounded-2xl p-3.5 glow-hover flex items-center gap-3">
                              <span className="w-10 h-10 shrink-0 grid place-items-center rounded-xl bg-teal-400/12 border border-teal-300/30 text-[13px] font-bold text-teal-100 tabular-nums">{s.number}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-quran text-[17px] text-[#f6efdf] truncate">سورة {s.name}</p>
                                <p className="text-[11px] text-teal-100/50 font-tajawal">{s.numberOfAyahs} آية</p>
                              </div>
                              <button onClick={() => playDefault(s.number)} className="w-9 h-9 grid place-items-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-[#16221a] active:scale-90 transition-all" aria-label="تشغيل">
                                <Play size={15} fill="currentColor" />
                              </button>
                              <FavHeart active onToggle={() => toggleFavSurah(s.number)} size={15} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {favReciterObjs.length > 0 && (
                      <div>
                        <h3 className="font-amiri font-bold text-[17px] text-teal-50 mb-3">القراء المفضلون ({favReciterObjs.length})</h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {favReciterObjs.map((r) => (
                            <div key={r.id} className="glass rounded-2xl p-3.5 glow-hover flex items-center gap-3">
                              <span className="w-11 h-11 shrink-0 grid place-items-center rounded-xl bg-teal-400/12 border border-teal-300/30 font-quran text-lg text-teal-100">{r.name.slice(0, 1)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-amiri font-bold text-[15px] text-[#f6efdf] truncate">{r.name}</p>
                                <p className="text-[11px] text-teal-100/50 font-tajawal truncate">{r.moshaf[0]?.name}</p>
                              </div>
                              {playingReciterId === r.id && <Equalizer playing={isPlaying} />}
                              <button
                                onClick={() => { setSelReciterId(r.id); setSelMoshaf(0); setTab("reciters"); }}
                                className="h-8 px-3 rounded-lg text-[12px] font-bold bg-teal-500/15 border border-teal-300/30 text-teal-100 active:scale-90 transition-all"
                              >
                                استماع
                              </button>
                              <FavHeart active onToggle={() => toggleFavReciter(r.id)} size={15} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ===== Mobile bottom nav (always visible) ===== */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-[60] border-t border-teal-300/15 bg-[#0b1410]/95 backdrop-blur-xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-6 px-1 py-1.5">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-col items-center gap-1 py-1.5 rounded-xl text-[10px] font-bold active:scale-90 transition-all",
                tab === id ? "text-teal-300" : "text-slate-400"
              )}
            >
              <span className={cn("grid place-items-center w-9 h-7 rounded-lg transition-all", tab === id && "bg-teal-400/15 shadow-[0_0_12px_rgba(143,191,154,0.3)]")}>
                <Icon size={17} />
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ===== Persistent player (sits above mobile nav) ===== */}
      <Player
        track={track}
        playUrl={playUrl}
        isCached={isCached}
        saveState={saveState}
        savePct={savePct}
        onSave={saveCurrentTrack}
        queue={currentQueue}
        surahNameOf={surahNameOf}
        onNext={() => stepTrack(1)}
        onPrev={() => stepTrack(-1)}
        onClose={() => { getAudio().pause(); setTrack(null); }}
        onEndedAuto={handleEnded}
        autoplay={autoplay}
        onToggleAutoplay={() => setAutoplay(!autoplay)}
      />

      {/* ===== In-app toast ===== */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            className="fixed top-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[85] max-w-md mx-auto"
          >
            <div className="glass-strong rounded-2xl border-amber-200/35 p-3.5 flex items-start gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
              <span className="shrink-0 w-9 h-9 rounded-xl grid place-items-center bg-amber-300/15 border border-amber-200/30 text-amber-200 pulse-gold">
                <BellRing size={17} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-amiri font-bold text-[14.5px] text-amber-50">{toast.title}</p>
                <p className="text-[12px] text-teal-50/70 font-tajawal mt-0.5 line-clamp-2">{toast.body}</p>
              </div>
              <button
                onClick={() => { if (toast.tab) setTab(toast.tab as Tab); setToast(null); }}
                className="shrink-0 h-8 px-2.5 rounded-lg bg-teal-400/15 border border-teal-300/30 text-teal-100 text-[11px] font-bold active:scale-90 transition-all"
              >
                عرض
              </button>
              <button onClick={() => setToast(null)} className="shrink-0 w-7 h-7 grid place-items-center rounded-lg text-teal-100/50 hover:text-teal-50 active:scale-90 transition-all" aria-label="إغلاق">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== مُسلم + مركز الإشعارات ===== */}
      <AssistantFab onClick={() => setAssistantOpen(true)} hidden={assistantOpen} />
      <Assistant
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        ctx={assistantCtx}
        onAction={runAssistantAction}
        aiConfig={aiConfig}
        setAiConfig={setAiConfig}
        online={online}
        messages={chat}
        setMessages={setChat}
        onNewReminder={addReminderFromAssistant}
      />
      <NotificationCenter
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        settings={notifSettings}
        setSettings={setNotifSettings}
        reminders={reminders}
        onDeleteReminder={(id) => setReminders((prev) => prev.filter((r) => r.id !== id))}
        onClearAuto={() => setReminders((prev) => prev.filter((r) => !r.auto))}
      />

      {/* ===== Footer ===== */}
      <footer className="relative z-10 border-t border-teal-300/12 bg-[#09110d]/90 backdrop-blur-xl pb-24 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-3">
              <BrandEmblem size={52} />
              <div>
                <p className="font-ruqaa text-[24px] brand-gradient font-bold leading-none">وِرْد</p>
                <p className="text-[12px] text-teal-100/50 font-tajawal mt-1.5">منصة وِرْد للقرآن الكريم</p>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex flex-wrap justify-center gap-2">
              {TABS.map(({ id, label }) => (
                <button key={id} onClick={() => { setTab(id); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-[12.5px] font-bold text-teal-100/55 hover:text-teal-100 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] active:scale-95 transition-all">
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8 pt-5 border-t border-teal-300/10 flex flex-col sm:flex-row items-center gap-3 text-[12px] text-teal-100/40 font-tajawal">
            <span className="flex items-center gap-1.5"><MapPin size={12} /> {usingGeo ? "الموقع الحالي" : city.label} {prayer && `• ${prayer.hijri.day} ${prayer.hijri.month.ar} ${prayer.hijri.year}هـ`}</span>
            <span className="sm:ms-auto text-center">صُنع بحب لخدمة كتاب الله • التلاوات عبر MP3Quran • النص والتفسير عبر AlQuran Cloud • المواقيت عبر Aladhan</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
