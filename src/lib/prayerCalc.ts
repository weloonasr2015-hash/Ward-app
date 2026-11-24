import type { HijriDate, PrayerData, PrayerTimings } from "./api";

/* ============================================================
   Offline prayer-time engine (no network needed)
   - NOAA solar calculations, single-pass with refinement
   - Egyptian General Authority angles (Fajr 19.5°, Isha 17.5°)
     to match Aladhan method=5 used online
   - Shafi'i Asr (shadow factor 1)
   - Hijri date via Intl islamic-umalqura calendar (built-in)
   ============================================================ */

export interface CityCoord {
  city: string;
  country: string;
  label: string;
  lat: number;
  lng: number;
  /** standard UTC offset (hours east) for the city itself */
  tz: number;
  /** DST rule applied on top of tz when in effect */
  dst?: "egypt" | "levant";
}

export const CITY_COORDS: CityCoord[] = [
  { city: "Cairo", country: "Egypt", label: "القاهرة", lat: 30.0444, lng: 31.2357, tz: 2, dst: "egypt" },
  { city: "Alexandria", country: "Egypt", label: "الإسكندرية", lat: 31.2001, lng: 29.9187, tz: 2, dst: "egypt" },
  { city: "Giza", country: "Egypt", label: "الجيزة", lat: 30.0131, lng: 31.2089, tz: 2, dst: "egypt" },
  { city: "Luxor", country: "Egypt", label: "الأقصر", lat: 25.6872, lng: 32.6396, tz: 2, dst: "egypt" },
  { city: "Aswan", country: "Egypt", label: "أسوان", lat: 24.0889, lng: 32.8998, tz: 2, dst: "egypt" },
  { city: "Mansoura", country: "Egypt", label: "المنصورة", lat: 31.0379, lng: 31.3815, tz: 2, dst: "egypt" },
  { city: "Tanta", country: "Egypt", label: "طنطا", lat: 30.7865, lng: 31.0004, tz: 2, dst: "egypt" },
  { city: "Riyadh", country: "Saudi Arabia", label: "الرياض", lat: 24.7136, lng: 46.6753, tz: 3 },
  { city: "Makkah", country: "Saudi Arabia", label: "مكة المكرمة", lat: 21.3891, lng: 39.8579, tz: 3 },
  { city: "Madinah", country: "Saudi Arabia", label: "المدينة المنورة", lat: 24.5247, lng: 39.5692, tz: 3 },
  { city: "Jeddah", country: "Saudi Arabia", label: "جدة", lat: 21.4858, lng: 39.1925, tz: 3 },
  { city: "Dubai", country: "UAE", label: "دبي", lat: 25.2048, lng: 55.2708, tz: 4 },
  { city: "Doha", country: "Qatar", label: "الدوحة", lat: 25.2854, lng: 51.531, tz: 3 },
  { city: "Amman", country: "Jordan", label: "عمّان", lat: 31.9539, lng: 35.9106, tz: 2, dst: "levant" },
  { city: "Jerusalem", country: "Palestine", label: "القدس", lat: 31.7683, lng: 35.2137, tz: 2, dst: "levant" },
  { city: "Istanbul", country: "Turkey", label: "إسطنبول", lat: 41.0082, lng: 28.9784, tz: 3 },
];

/** Approximate DST: Egypt (last Fri Apr → last Thu Oct), Levant (Apr–Sep + edges) */
function dstActive(rule: "egypt" | "levant", d: Date): boolean {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (rule === "egypt") {
    if (m > 4 && m < 10) return true;
    if (m === 4 && day >= 24) return true;
    if (m === 10 && day <= 28) return true;
    return false;
  }
  if (m > 3 && m < 10) return true;
  if (m === 3 && day >= 25) return true;
  if (m === 10 && day <= 28) return true;
  return false;
}

export function cityOffset(c: CityCoord, d: Date = new Date()): number {
  return c.tz + (c.dst && dstActive(c.dst, d) ? 1 : 0);
}

export function findCityCoord(city: string, country: string, label: string): CityCoord {
  return (
    CITY_COORDS.find((c) => c.label === label) ||
    CITY_COORDS.find((c) => c.city === city && c.country === country) ||
    CITY_COORDS[0]
  );
}

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

function clamp(x: number): number {
  return Math.min(1, Math.max(-1, x));
}

function fmtTime(minutes: number): string {
  let m = Math.round(minutes);
  m = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function calcTimings(lat: number, lng: number, date: Date = new Date(), tzOverride?: number): PrayerTimings {
  const N = dayOfYear(date);
  // For geolocation (user is there) the device offset is right; for named
  // cities we use the city's own offset so travellers see correct wall times.
  const tz = tzOverride ?? -date.getTimezoneOffset() / 60; // hours east of UTC
  const lngHour = lng / 15;
  const g = ((2 * Math.PI) / 365) * (N - 1 + (12 - lngHour) / 24);

  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));

  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);

  const solarNoon = 720 - 4 * lng - eqTime + tz * 60; // minutes
  const phi = lat * D2R;

  const hourAngle = (angleDeg: number): number => {
    const a = angleDeg * D2R;
    const cosH = clamp((Math.sin(a) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl)));
    return Math.acos(cosH) * R2D * 4; // minutes
  };

  const sunrise = solarNoon - hourAngle(-0.833);
  const sunset = solarNoon + hourAngle(-0.833);
  const fajr = solarNoon - hourAngle(-19.5);
  const isha = solarNoon + hourAngle(-17.5);
  const dhuhr = solarNoon + 2;

  // Asr (Shafi'i): shadow = 1 + tan(|phi - decl|)
  const diff = Math.abs(phi - decl);
  const asrAngle = Math.atan(1 / (1 + Math.tan(diff))); // radians above horizon
  const cosH = clamp(
    (Math.sin(asrAngle) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl))
  );
  const asr = solarNoon + Math.acos(cosH) * R2D * 4;

  return {
    Fajr: fmtTime(fajr),
    Sunrise: fmtTime(sunrise),
    Dhuhr: fmtTime(dhuhr),
    Asr: fmtTime(asr),
    Maghrib: fmtTime(sunset),
    Isha: fmtTime(isha),
  };
}

/* ---------- Hijri date (built-in Intl, zero network) ---------- */
const HIJRI_MONTH_AR = [
  "محرم", "صفر", "ربيع الأول", "ربيع الآخر",
  "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
  "رمضان", "شوال", "ذو القعدة", "ذو الحجة",
];

function arithmeticHijri(d: Date): HijriDate {
  // Kuwaiti algorithm fallback (approximate)
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
  let jd = Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4) +
    Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4) + day - 32075;
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hMonth = Math.floor((24 * l) / 709);
  const hDay = l - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;
  const wdEn = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(d);
  const wdAr = new Intl.DateTimeFormat("ar-EG", { weekday: "long" }).format(d);
  return {
    day: String(hDay),
    month: { number: hMonth, en: `Month ${hMonth}`, ar: HIJRI_MONTH_AR[hMonth - 1] || "" },
    year: String(hYear),
    weekday: { en: wdEn, ar: wdAr },
  };
}

export function hijriFromDate(d: Date): HijriDate {
  try {
    const numFmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric", month: "numeric", year: "numeric",
    });
    const parts = numFmt.formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
    const day = parseInt(get("day"), 10);
    const month = parseInt(get("month"), 10);
    const yearRaw = get("year").replace(/[^0-9]/g, "");
    if (!day || !month || !yearRaw) throw new Error("hijri-parse");
    const wdEn = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(d);
    const wdAr = new Intl.DateTimeFormat("ar-EG", { weekday: "long" }).format(d);
    return {
      day: String(day),
      month: { number: month, en: `Month ${month}`, ar: HIJRI_MONTH_AR[month - 1] || "" },
      year: yearRaw,
      weekday: { en: wdEn, ar: wdAr },
    };
  } catch {
    return arithmeticHijri(d);
  }
}

function gregorianFull(d: Date): string {
  try {
    const p = new Intl.DateTimeFormat("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).formatToParts(d);
    const get = (t: string) => p.find((x) => x.type === t)?.value || "";
    return `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}`;
  } catch {
    return d.toDateString();
  }
}

export function offlinePrayerByCoords(lat: number, lng: number, date: Date = new Date()): PrayerData {
  return {
    timings: calcTimings(lat, lng, date),
    hijri: hijriFromDate(date),
    gregorian: `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`,
    gregorianFull: gregorianFull(date),
  };
}

export function offlinePrayerByCity(city: string, country: string, label: string, date: Date = new Date()): PrayerData {
  const c = findCityCoord(city, country, label);
  return {
    timings: calcTimings(c.lat, c.lng, date, cityOffset(c, date)),
    hijri: hijriFromDate(date),
    gregorian: `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`,
    gregorianFull: gregorianFull(date),
  };
}
