import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin, LocateFixed, MoonStar, Sunrise, Sun, Sunset, Moon,
  Clock3, CalendarDays, Sparkles, Star, Mountain, Gem, CalendarClock, Loader2,
} from "lucide-react";
import type { PrayerData } from "../lib/api";
import { upcomingFasting, hijriMonthName } from "../lib/api";
import { cn } from "../utils/cn";

interface Props {
  prayer: PrayerData | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  city: { city: string; country: string; label: string };
  setCity: (c: { city: string; country: string; label: string }) => void;
  onLocate: () => void;
  locating: boolean;
  usingGeo: boolean;
}

export const CITIES = [
  { city: "Cairo", country: "Egypt", label: "القاهرة" },
  { city: "Alexandria", country: "Egypt", label: "الإسكندرية" },
  { city: "Giza", country: "Egypt", label: "الجيزة" },
  { city: "Luxor", country: "Egypt", label: "الأقصر" },
  { city: "Aswan", country: "Egypt", label: "أسوان" },
  { city: "Riyadh", country: "Saudi Arabia", label: "الرياض" },
  { city: "Makkah", country: "Saudi Arabia", label: "مكة المكرمة" },
  { city: "Madinah", country: "Saudi Arabia", label: "المدينة المنورة" },
  { city: "Dubai", country: "UAE", label: "دبي" },
  { city: "Doha", country: "Qatar", label: "الدوحة" },
  { city: "Amman", country: "Jordan", label: "عمّان" },
  { city: "Istanbul", country: "Turkey", label: "إسطنبول" },
];

const PRAYER_META = [
  { key: "Fajr", name: "الفجر", Icon: MoonStar },
  { key: "Sunrise", name: "الشروق", Icon: Sunrise },
  { key: "Dhuhr", name: "الظهر", Icon: Sun },
  { key: "Asr", name: "العصر", Icon: Clock3 },
  { key: "Maghrib", name: "المغرب", Icon: Sunset },
  { key: "Isha", name: "العشاء", Icon: Moon },
] as const;

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function fmtCountdown(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
function toArDigits(s: string) {
  return s.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

export default function Prayer(p: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const next = useMemo(() => {
    if (!p.prayer) return null;
    const t = p.prayer.timings;
    const order = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
    const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    for (const k of order) {
      if (toMin(t[k]) > nowMin) return k;
    }
    return "Fajr" as const;
  }, [p.prayer, now]);

  const countdown = useMemo(() => {
    if (!p.prayer || !next) return "--:--:--";
    const target = new Date(now);
    const [h, m] = p.prayer.timings[next].split(":").map(Number);
    target.setHours(h, m, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    return fmtCountdown(target.getTime() - now.getTime());
  }, [p.prayer, next, now]);

  const fasting = useMemo(() => {
    if (!p.prayer) return [];
    const d = parseInt(p.prayer.hijri.day, 10) || 1;
    const mo = p.prayer.hijri.month.number || 1;
    return upcomingFasting(d, mo, p.prayer.hijri.weekday.en);
  }, [p.prayer]);

  const iconFor = (icon: string) => {
    switch (icon) {
      case "moon": return MoonStar;
      case "calendar": return CalendarDays;
      case "star": return Star;
      case "mountain": return Mountain;
      case "sparkles": return Sparkles;
      default: return Gem;
    }
  };

  const hijriDay = p.prayer ? parseInt(p.prayer.hijri.day, 10) : 0;

  return (
    <div className="space-y-4">
      {/* controls */}
      <div className="glass rounded-2xl p-4 flex flex-wrap items-center gap-2.5">
        <button
          onClick={p.onLocate}
          disabled={p.locating}
          className="h-10 px-4 rounded-xl bg-gradient-to-l from-teal-400 to-teal-600 text-[#16221a] text-[13px] font-bold flex items-center gap-1.5 shadow-[0_0_18px_rgba(143,191,154,0.35)] active:scale-95 transition-all disabled:opacity-60"
        >
          {p.locating ? <Loader2 size={15} className="animate-spin" /> : <LocateFixed size={15} />}
          {p.locating ? "جارٍ تحديد الموقع..." : "تحديد موقعي"}
        </button>
        <span className="text-[12px] text-teal-100/40 font-bold">أو اختر المدينة:</span>
        <div className="flex flex-wrap gap-1.5">
          {CITIES.map((c) => (
            <button
              key={c.label}
              onClick={() => p.setCity(c)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[12px] font-bold border active:scale-90 transition-all",
                !p.usingGeo && p.city.label === c.label
                  ? "bg-teal-400/20 border-teal-300/60 text-teal-100 shadow-[0_0_12px_rgba(143,191,154,0.3)]"
                  : "bg-white/[0.03] border-white/10 text-slate-300 hover:border-teal-300/40 hover:text-teal-100"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {p.loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : p.error || !p.prayer ? (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="font-amiri text-lg text-rose-200">تعذّر تحميل مواقيت الصلاة</p>
          <button onClick={p.onRetry} className="mt-3 px-5 py-2 rounded-xl bg-teal-500/15 border border-teal-300/30 text-teal-100 text-sm font-bold">إعادة المحاولة</button>
        </div>
      ) : (
        <>
          {/* hijri + countdown hero */}
          <div className="grid lg:grid-cols-[1fr_340px] gap-4">
            <div className="glass-strong rounded-3xl p-5 sm:p-6 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-teal-500/15 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-amber-400/10 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[12px] font-bold text-teal-200/70">
                  <MapPin size={14} />
                  {p.usingGeo ? "حسب موقعك الحالي" : p.city.label} • {p.prayer.gregorianFull}
                </div>
                <h3 className="font-ruqaa text-[24px] sm:text-[30px] text-[#f6efdf] mt-2 leading-snug">
                  {toArDigits(p.prayer.hijri.day)} {p.prayer.hijri.month.ar} {toArDigits(p.prayer.hijri.year)}هـ
                </h3>
                <p className="text-[13px] text-teal-100/55 font-tajawal mt-1">{p.prayer.hijri.weekday.ar} • شهر {hijriMonthName(p.prayer.hijri.month.number)}</p>

                <div className="mt-5 rounded-2xl border border-amber-200/30 bg-gradient-to-l from-amber-300/[0.09] to-teal-400/[0.06] p-4 flex flex-wrap items-center gap-3">
                  <span className="w-11 h-11 rounded-2xl grid place-items-center bg-amber-300/15 border border-amber-200/30 text-amber-200 pulse-gold">
                    <CalendarClock size={20} />
                  </span>
                  <div className="flex-1 min-w-[140px]">
                    <p className="text-[12px] font-bold text-amber-100/70">الصلاة القادمة: {PRAYER_META.find((x) => x.key === next)?.name}</p>
                    <p className="font-tajawal font-800 font-bold text-[30px] tabular-nums text-[#f6efdf] tracking-wider" dir="ltr">
                      {toArDigits(countdown)}
                    </p>
                  </div>
                  <span className="text-[12px] font-bold text-teal-100/70 bg-black/25 border border-teal-300/20 rounded-xl px-3 py-2">
                    الأذان {toArDigits(p.prayer.timings[next as keyof typeof p.prayer.timings] || "")}
                  </span>
                </div>
              </div>
            </div>

            {/* prayer grid side */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5">
              {PRAYER_META.map(({ key, name, Icon }, i) => {
                const isNext = next === key;
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "rounded-2xl border p-3.5 text-center relative overflow-hidden transition-all",
                      isNext
                        ? "bg-gradient-to-b from-amber-300/[0.14] to-teal-400/[0.08] border-amber-200/50 shadow-[0_0_22px_rgba(217,174,95,0.2)]"
                        : "glass"
                    )}
                  >
                    {isNext && <span className="absolute top-0 inset-x-6 h-0.5 bg-gradient-to-l from-transparent via-amber-300 to-transparent" />}
                    <Icon size={19} className={cn("mx-auto mb-1.5", isNext ? "text-amber-200" : "text-teal-300/80")} />
                    <p className={cn("text-[13px] font-bold", isNext ? "text-amber-100" : "text-teal-50/90")}>{name}</p>
                    <p className="font-tajawal font-bold text-[19px] tabular-nums text-[#f6efdf] mt-0.5" dir="ltr">{toArDigits(p.prayer!.timings[key])}</p>
                    {isNext && <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-300/20 text-amber-100 border border-amber-200/30">القادمة</span>}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* fasting tracker */}
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center gap-3 mb-1">
              <span className="w-10 h-10 rounded-2xl grid place-items-center bg-amber-300/12 border border-amber-200/30 text-amber-200">
                <MoonStar size={19} />
              </span>
              <div>
                <h3 className="font-ruqaa text-[21px] text-[#f6efdf]">تنبيهات أيام الصيام</h3>
                <p className="text-[12px] text-teal-100/55 font-tajawal">اليوم {toArDigits(String(hijriDay))} {hijriMonthName(p.prayer.hijri.month.number)} — الأيام المستحب صيامها وفضلها</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {fasting.map((f, i) => {
                const Icon = iconFor(f.icon);
                const isNow = f.daysLeft === 0;
                return (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "rounded-2xl border p-4 relative overflow-hidden",
                      isNow
                        ? "bg-gradient-to-b from-amber-300/[0.12] to-transparent border-amber-200/45 shadow-[0_0_20px_rgba(217,174,95,0.15)]"
                        : "bg-black/20 border-teal-300/15"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={cn("w-9 h-9 shrink-0 rounded-xl grid place-items-center border", isNow ? "bg-amber-300/15 border-amber-200/30 text-amber-200" : "bg-teal-400/10 border-teal-300/25 text-teal-200")}>
                        <Icon size={17} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-amiri font-bold text-[15.5px] text-[#f6efdf]">{f.title}</p>
                        <p className="text-[11.5px] text-teal-100/55 font-bold mt-0.5">{f.when}</p>
                      </div>
                      {f.daysLeft !== null && (
                        <span className={cn(
                          "shrink-0 text-[10.5px] font-bold px-2 py-1 rounded-full border whitespace-nowrap",
                          isNow ? "bg-amber-300/20 border-amber-200/40 text-amber-100" : "bg-teal-400/10 border-teal-300/25 text-teal-100"
                        )}>
                          {isNow ? "اليوم / قائم" : f.daysLeft === 1 ? "بعد يوم" : `بعد ${toArDigits(String(f.daysLeft))} أيام`}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] leading-relaxed text-teal-50/70 font-tajawal mt-2.5 border-r-2 border-teal-300/25 pr-2.5">{f.virtue}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
