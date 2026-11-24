export interface Moshaf {
  id: number;
  name: string;
  server: string;
  surah_total: number;
  moshaf_type: number;
  surah_list: string;
  /** custom per-surah audio URLs (featured reciters outside MP3Quran) */
  tracks?: Record<number, string>;
}

/** Normalize Arabic for search: strip tashkeel, unify alef/hamza, taa marbuta, alef maqsura */
export function normAr(s: string): string {
  return (s || "")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")      // tashkeel + tatweel
    .replace(/[\u06D6-\u06ED\u06DD-\u06DF]/g, "")      // Quranic annotation marks (small high signs, ayah end)
    .replace(/[\u0671\u0672\u0673\u0675]/g, "ا")       // alef wasla & other alef forms
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export interface Reciter {
  id: number;
  name: string;
  letter: string;
  moshaf: Moshaf[];
}

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

import { FEATURED_RECITERS } from "../data/featuredReciters";
import { isNetworkAllowed } from "./net";

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  page?: number;
}

/** True when the device currently has no internet connection */
export function isOfflineNow(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.onLine === false;
}

async function onlineOrThrow(url: string, ms = 9000): Promise<Response> {
  // Respect the manual متصل/غير متصل switch: use bundled data instantly.
  if (!isNetworkAllowed()) throw new Error("forced-offline");
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error("http-" + res.status);
    return res;
  } finally {
    clearTimeout(id);
  }
}

const pad3 = (n: number) => String(n).padStart(3, "0");

export function surahAudioUrl(moshaf: Moshaf, surahNumber: number): string {
  // Featured custom reciter: explicit per-surah URL ("" when unavailable)
  if (moshaf.tracks) return moshaf.tracks[surahNumber] || "";
  let server = moshaf.server || "";
  if (!server) return "";
  if (!server.endsWith("/")) server += "/";
  return `${server}${pad3(surahNumber)}.mp3`;
}

/** Merge hand-curated featured reciters (e.g. Hussein Al-Azzam) on top, deduped */
export function withFeaturedReciters(list: Reciter[]): Reciter[] {
  const feat = FEATURED_RECITERS || [];
  if (!feat.length) return list;
  const has = (n: string) => list.some((r) => r.name.includes(n) || n.includes(r.name));
  const missing = feat.filter((f) => !has(f.name));
  return [...missing, ...list];
}

export function parseSurahList(list: string): number[] {
  if (!list) return [];
  return list
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 1 && n <= 114)
    .sort((a, b) => a - b);
}

export async function fetchReciters(): Promise<Reciter[]> {
  try {
    const res = await onlineOrThrow("https://www.mp3quran.net/api/v3/reciters?language=ar", 10000);
    const json = await res.json();
    const reciters: Reciter[] = json.reciters || json.data || [];
    if (!reciters.length) throw new Error("empty");
    return withFeaturedReciters(reciters);
  } catch {
    // OFFLINE FALLBACK: bundled reciter directory (244 reciters, servers included)
    const { getOfflineReciters } = await import("./offline");
    const local = await getOfflineReciters();
    if (!local.length) throw new Error("reciters");
    return withFeaturedReciters(local);
  }
}

export async function fetchSurahsMeta(): Promise<SurahMeta[]> {
  try {
    const res = await onlineOrThrow("https://api.alquran.cloud/v1/surah", 10000);
    const json = await res.json();
    const list: SurahMeta[] = json.data || [];
    if (!list.length) throw new Error("empty");
    const { withPlainNames } = await import("./offline");
    return withPlainNames(list);
  } catch {
    // OFFLINE FALLBACK: bundled clean metadata (114 surahs)
    const { offlineSurahMeta } = await import("./offline");
    return offlineSurahMeta();
  }
}

export async function fetchSurahText(surahNumber: number): Promise<Ayah[]> {
  try {
    const res = await onlineOrThrow(`https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`, 10000);
    const json = await res.json();
    const ayahs: Ayah[] = json.data?.ayahs || [];
    if (!ayahs.length) throw new Error("empty");
    return ayahs;
  } catch {
    // OFFLINE FALLBACK: bundled Uthmani text (all 6236 ayahs on-device)
    const { offlineSurahText } = await import("./offline");
    return offlineSurahText(surahNumber);
  }
}

export async function fetchSurahTafsir(surahNumber: number): Promise<Ayah[]> {
  try {
    const res = await onlineOrThrow(`https://api.alquran.cloud/v1/surah/${surahNumber}/ar.muyassar`, 10000);
    const json = await res.json();
    const ayahs: Ayah[] = json.data?.ayahs || [];
    if (!ayahs.length) throw new Error("empty");
    return ayahs;
  } catch {
    // OFFLINE FALLBACK: bundled Tafsir Al-Muyassar (full, on-device)
    const { offlineSurahTafsir } = await import("./offline");
    return offlineSurahTafsir(surahNumber);
  }
}

export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}
export interface HijriDate {
  day: string;
  month: { number: number; en: string; ar: string };
  year: string;
  weekday: { en: string; ar: string };
  fullAr?: string;
}
export interface PrayerData {
  timings: PrayerTimings;
  hijri: HijriDate;
  gregorian: string;
  gregorianFull: string;
}

function cleanTime(t: string): string {
  return (t || "").split(" ")[0].slice(0, 5);
}

/** Last fetch source: 'online' (Aladhan API) or 'offline' (on-device astronomy) */
export let prayerSource: "online" | "offline" = "online";
export function getPrayerSource(): "online" | "offline" {
  return prayerSource;
}

function toPrayerData(d: {
  timings: Record<string, string>;
  date: { hijri: HijriDate; gregorian: { date: string; weekday: { en: string }; day: string; month: { en: string }; year: string } };
}): PrayerData {
  return {
    timings: {
      Fajr: cleanTime(d.timings.Fajr),
      Sunrise: cleanTime(d.timings.Sunrise),
      Dhuhr: cleanTime(d.timings.Dhuhr),
      Asr: cleanTime(d.timings.Asr),
      Maghrib: cleanTime(d.timings.Maghrib),
      Isha: cleanTime(d.timings.Isha),
    },
    hijri: {
      day: d.date.hijri.day,
      month: d.date.hijri.month,
      year: d.date.hijri.year,
      weekday: d.date.hijri.weekday,
    },
    gregorian: d.date.gregorian.date,
    gregorianFull: `${d.date.gregorian.weekday.en} ${d.date.gregorian.day} ${d.date.gregorian.month.en} ${d.date.gregorian.year}`,
  };
}

export async function fetchPrayerByCoords(lat: number, lng: number): Promise<PrayerData> {
  try {
    const res = await onlineOrThrow(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=5`, 10000);
    const json = await res.json();
    prayerSource = "online";
    return toPrayerData(json.data);
  } catch {
    // OFFLINE FALLBACK: on-device astronomical calculation (Egyptian angles)
    const { offlinePrayerByCoords } = await import("./prayerCalc");
    prayerSource = "offline";
    return offlinePrayerByCoords(lat, lng);
  }
}

export async function fetchPrayerByCity(city: string, country: string): Promise<PrayerData> {
  try {
    const res = await onlineOrThrow(
      `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=5`,
      10000
    );
    const json = await res.json();
    prayerSource = "online";
    return toPrayerData(json.data);
  } catch {
    // OFFLINE FALLBACK: coordinates table + on-device calculation
    const { offlinePrayerByCity } = await import("./prayerCalc");
    prayerSource = "offline";
    return offlinePrayerByCity(city, country, city);
  }
}

/* ---------- Reciter prioritization ---------- */
export const EGYPTIAN_MASTERS = [
  "عبد الباسط عبد الصمد",
  "محمد صديق المنشاوي",
  "محمود خليل الحصري",
  "مصطفى إسماعيل",
  "محمود علي البنا",
  "محمد رفعت",
  "أحمد نعينع",
  "إسلام صبحي",
  "محمود الشحات",
  "محمود الشحات أنور",
  "محمد عبد الكريم",
  "هاني الرفاعي",
  "أحمد بن علي العجمي",
  "طارق عبد الغني دعوب",
  "عبد الله عواد الجهني",
  "مشاري",
];

export const FAMOUS_ARAB = [
  "حسين العزام",
  "مشاري راشد العفاسي",
  "ماهر المعيقلي",
  "ياسر الدوسري",
  "ناصر القطامي",
  "سعد الغامدي",
  "فارس عباد",
  "عبد الرحمن السديس",
  "سعود الشريم",
  "خالد الجليل",
  "محمد أيوب",
  "هزاع البلوشي",
  "بدر التركي",
  "عبد الله بصفر",
  "علي الحذيفي",
  "أحمد الحواشي",
  "محمد المحيسني",
];

export function isEgyptian(name: string): boolean {
  const eg = [
    "عبد الباسط", "المنشاوي", "الحصري", "مصطفى إسماعيل", "البنا", "محمد رفعت",
    "نعينع", "إسلام صبحي", "الشحات", "الطاروطي", "الليثي", "عمران",
    "شعيشع", "البهتيمي", "الفشني", "غلوش", "معبد", "الدمياطي", "الصياد",
    "عبد الحكم", "راغب", "الزناتي", "عبد العزيز حصان", "محمود عبد الحكم",
    "محمد أحمد", "عبد المحسن", "هاني الرفاعي", "محمد عبد الكريم", "ماهر شخاشيرو",
    "عبد الله كامل", "محمود سعد", "السيد متولي", "الشحات أنور",
  ];
  return eg.some((k) => name.includes(k));
}

export function isFamous(name: string): boolean {
  const keys = ["العزام","عزام","العفاسي","المعيقلي","الدوسري","القطامي","الغامدي","فارس عباد","السديس","الشريم","الجليل","محمد أيوب","البلوشي","بدر التركي","العجمي","الحصري","المنشاوي","عبد الباسط","الحذيفي","بصفر","الشاطري","المطوع","الجهني","الحارثي","الشهريار"];
  return keys.some((k) => name.includes(k));
}

export function priorityScore(name: string): number {
  if (name.includes("العزام") || name.includes("عزام")) return -1; // featured: Hussein Al-Azzam first
  const order = [
    "عبد الباسط عبد الصمد", "محمد صديق المنشاوي", "محمود خليل الحصري",
    "مشاري راشد العفاسي", "ماهر المعيقلي", "ياسر الدوسري",
    "مصطفى إسماعيل", "محمود علي البنا", "سعد الغامدي",
    "عبد الرحمن السديس", "سعود الشريم", "فارس عباد",
    "ناصر القطامي", "إسلام صبحي", "محمد رفعت",
    "أحمد نعينع", "هزاع البلوشي", "خالد الجليل",
    "محمد أيوب", "بدر التركي", "محمود الشحات",
  ];
  for (let i = 0; i < order.length; i++) {
    if (name.includes(order[i]) || order[i].includes(name)) return i;
  }
  if (isEgyptian(name)) return 40;
  if (isFamous(name)) return 60;
  return 100;
}

export function sortReciters(reciters: Reciter[]): Reciter[] {
  return [...reciters].sort((a, b) => {
    const sa = priorityScore(a.name);
    const sb = priorityScore(b.name);
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name, "ar");
  });
}

/* ---------- Fasting logic ---------- */
export interface FastingAlert {
  kind: "today" | "tomorrow";
  title: string;
  detail: string;
  gold?: boolean;
}

const HIJRI_MONTHS_AR: Record<number, string> = {
  1: "محرم", 2: "صفر", 3: "ربيع الأول", 4: "ربيع الآخر",
  5: "جمادى الأولى", 6: "جمادى الآخرة", 7: "رجب", 8: "شعبان",
  9: "رمضان", 10: "شوال", 11: "ذو القعدة", 12: "ذو الحجة",
};
export function hijriMonthName(n: number): string {
  return HIJRI_MONTHS_AR[n] || "";
}

export function getFastingAlerts(hijriDay: number, hijriMonth: number, weekdayEn: string): FastingAlert[] {
  const alerts: FastingAlert[] = [];
  const isMon = weekdayEn === "Monday";
  const isThu = weekdayEn === "Thursday";
  // البيض 13 14 15
  if ([13, 14, 15].includes(hijriDay)) {
    alerts.push({
      kind: "today",
      title: `اليوم من الأيام البيض (${hijriDay} ${hijriMonthName(hijriMonth)})`,
      detail: "صيام الأيام البيض سنة مؤكدة — تقبّل الله منك",
      gold: true,
    });
  } else if ([12].includes(hijriDay)) {
    alerts.push({
      kind: "tomorrow",
      title: `غداً أول الأيام البيض (13 ${hijriMonthName(hijriMonth)})`,
      detail: "لا تنسَ نية الصيام — صيام ثلاثة أيام من كل شهر كصيام الدهر",
      gold: true,
    });
  } else if (hijriDay === 11) {
    alerts.push({ kind: "tomorrow", title: "بعد غد تبدأ الأيام البيض", detail: "جهّز نية الصيام (13، 14، 15)", gold: true });
  }
  if (isMon || isThu) {
    alerts.push({
      kind: "today",
      title: isMon ? "اليوم الإثنين — سنة الصيام" : "اليوم الخميس — سنة الصيام",
      detail: "كان ﷺ يصوم الإثنين والخميس — تُعرض فيهما الأعمال",
    });
  }
  // عاشوراء
  if (hijriMonth === 1 && hijriDay === 9) alerts.push({ kind: "today", title: "اليوم تاسوعاء (9 محرم)", detail: "يُستحب صيامه مع عاشوراء", gold: true });
  if (hijriMonth === 1 && hijriDay === 10) alerts.push({ kind: "today", title: "اليوم عاشوراء (10 محرم)", detail: "صيامه يكفّر سنة ماضية — تقبّل الله", gold: true });
  if (hijriMonth === 1 && hijriDay === 8) alerts.push({ kind: "tomorrow", title: "غداً تاسوعاء (9 محرم)", detail: "لا تنسَ نية الصيام مع عاشوراء", gold: true });
  // عرفة
  if (hijriMonth === 12 && hijriDay === 9) alerts.push({ kind: "today", title: "اليوم يوم عرفة (9 ذو الحجة)", detail: "صيامه يكفّر سنتين — أكثِر من الدعاء", gold: true });
  if (hijriMonth === 12 && hijriDay === 8) alerts.push({ kind: "tomorrow", title: "غداً يوم عرفة", detail: "جهّز نية الصيام والدعاء", gold: true });
  // عشر ذي الحجة
  if (hijriMonth === 12 && hijriDay >= 1 && hijriDay <= 8)
    alerts.push({ kind: "today", title: `العشر الأوائل من ذي الحجة (اليوم ${hijriDay})`, detail: "يُستحب الصيام فيها — العمل الصالح أحب إلى الله", gold: true });
  // ست شوال
  if (hijriMonth === 10 && hijriDay >= 2 && hijriDay <= 7)
    alerts.push({ kind: "today", title: "أيام الست من شوال", detail: "من صام رمضان ثم أتبعه ستاً من شوال كان كصيام الدهر" });
  // رمضان
  if (hijriMonth === 9) alerts.push({ kind: "today", title: "شهر رمضان المبارك", detail: "تقبّل الله صيامكم وقيامكم 🌙" });
  // شعبان - ليلة النصف؟
  if (hijriMonth === 8 && hijriDay >= 13 && hijriDay <= 15 && alerts.length === 0) {
    // already covered by white days
  }
  return alerts;
}

export interface FastingCard {
  title: string;
  when: string;
  virtue: string;
  daysLeft: number | null;
  icon: string;
}

export function upcomingFasting(hijriDay: number, hijriMonth: number, weekdayEn: string): FastingCard[] {
  const cards: FastingCard[] = [];
  const toWhite = hijriDay <= 13 ? 13 - hijriDay : 29 - hijriDay + 13; // approx 29/30
  cards.push({
    title: "الأيام البيض",
    when: `13، 14، 15 ${hijriMonthName(hijriMonth)}`,
    virtue: "صيام ثلاثة أيام من كل شهر كصيام الدهر كله",
    daysLeft: hijriDay >= 13 && hijriDay <= 15 ? 0 : toWhite,
    icon: "moon",
  });
  const dowMap: Record<string, number> = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 0 };
  const todayIdx = dowMap[weekdayEn] ?? 0;
  const toThu = (4 - todayIdx + 7) % 7;
  const toMon = (1 - todayIdx + 7) % 7;
  const nextWeekly = Math.min(toThu === 0 ? 0 : toThu, toMon === 0 ? 0 : toMon);
  cards.push({
    title: "الإثنين والخميس",
    when: "أسبوعياً",
    virtue: "تُعرض الأعمال فيهما ويحب ﷺ أن يُعرض عمله وهو صائم",
    daysLeft: nextWeekly === 0 ? 0 : Math.min(toThu || 7, toMon || 7),
    icon: "calendar",
  });
  // عاشوراء
  let toAshura: number | null = null;
  if (hijriMonth === 1) toAshura = hijriDay <= 10 ? 10 - hijriDay : null;
  else if (hijriMonth < 1) toAshura = null;
  else toAshura = null;
  cards.push({
    title: "تاسوعاء وعاشوراء",
    when: "9 و 10 محرم",
    virtue: "صيام عاشوراء يكفّر السنة الماضية",
    daysLeft: hijriMonth === 1 && hijriDay <= 10 ? 10 - hijriDay : null,
    icon: "star",
  });
  cards.push({
    title: "يوم عرفة",
    when: "9 ذو الحجة",
    virtue: "يكفّر السنة الماضية والباقية لغير الحاج",
    daysLeft: hijriMonth === 12 && hijriDay <= 9 ? 9 - hijriDay : hijriMonth < 12 ? null : null,
    icon: "mountain",
  });
  cards.push({
    title: "الست من شوال",
    when: "بعد عيد الفطر",
    virtue: "من صامها مع رمضان فكأنما صام الدهر",
    daysLeft: hijriMonth === 10 && hijriDay <= 7 ? 0 : null,
    icon: "sparkles",
  });
  cards.push({
    title: "العشر من ذي الحجة",
    when: "1 – 9 ذو الحجة",
    virtue: "ما من أيام العمل الصالح فيها أحب إلى الله",
    daysLeft: hijriMonth === 12 && hijriDay <= 9 ? 0 : null,
    icon: "gem",
  });
  void toAshura;
  return cards;
}
