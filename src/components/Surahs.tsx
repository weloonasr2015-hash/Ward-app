import { motion } from "framer-motion";
import { BookOpen, Play, Search, ListFilter } from "lucide-react";
import type { SurahMeta } from "../lib/api";
import { Equalizer, FavHeart, SkeletonGrid, ErrorBox } from "./shared";
import { cn } from "../utils/cn";

interface Props {
  surahs: SurahMeta[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  search: string;
  setSearch: (s: string) => void;
  filter: "all" | "makki" | "madani";
  setFilter: (f: "all" | "makki" | "madani") => void;
  favSurahs: Set<number>;
  onToggleFav: (n: number) => void;
  onPlay: (surahNumber: number) => void;
  onRead: (surahNumber: number) => void;
  playingSurah: number | null;
  isPlaying: boolean;
}

function badge(n: number) {
  return (
    <span className="relative shrink-0 w-11 h-11 grid place-items-center">
      <svg viewBox="0 0 44 44" className="absolute inset-0 w-full h-full text-teal-300/50">
        <rect x="7" y="7" width="30" height="30" rx="7" transform="rotate(45 22 22)" fill="rgba(143,191,154,0.08)" stroke="currentColor" strokeWidth="1.4" />
        <rect x="11.5" y="11.5" width="21" height="21" rx="5" transform="rotate(45 22 22)" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" />
      </svg>
      <span className="relative font-tajawal font-800 font-bold text-[14px] text-teal-100 tabular-nums">{n}</span>
    </span>
  );
}

export default function Surahs(p: Props) {
  const q = p.search.trim();
  const filtered = p.surahs.filter((s) => {
    if (p.filter === "makki" && !s.revelationType.includes("Meccan")) return false;
    if (p.filter === "madani" && !s.revelationType.includes("Medinan")) return false;
    if (!q) return true;
    const num = parseInt(q.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString()), 10);
    return s.name.includes(q) || s.englishName.toLowerCase().includes(q.toLowerCase()) || (!isNaN(num) && s.number === num);
  });

  return (
    <div>
      {/* filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-teal-100/50 font-bold"><ListFilter size={14} /> تصفية:</span>
        {([["all", "الكل (114)"], ["makki", "مكية"], ["madani", "مدنية"]] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => p.setFilter(v)}
            className={cn(
              "px-4 py-1.5 rounded-full text-[13px] font-bold border active:scale-90 transition-all duration-150",
              p.filter === v
                ? "bg-gradient-to-l from-teal-400 to-teal-600 text-[#16221a] border-transparent shadow-[0_0_18px_rgba(143,191,154,0.4)]"
                : "bg-white/[0.03] text-teal-100/70 border-teal-300/20 hover:border-teal-300/50 hover:text-teal-100"
            )}
          >
            {label}
          </button>
        ))}
        <span className="ms-auto text-[12px] text-teal-100/40 font-tajawal">{filtered.length} سورة</span>
      </div>

      {p.loading ? (
        <SkeletonGrid n={12} />
      ) : p.error ? (
        <ErrorBox message="تعذّر تحميل فهرس السور — تحقق من الاتصال بالإنترنت" onRetry={p.onRetry} />
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Search className="mx-auto text-teal-300/40 mb-3" size={32} />
          <p className="font-amiri text-lg text-teal-100/70">لا توجد نتائج مطابقة لـ «{p.search}»</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filtered.map((s, i) => {
            const isCur = p.playingSurah === s.number;
            const fav = p.favSurahs.has(s.number);
            const makki = s.revelationType.includes("Meccan");
            return (
              <motion.div
                key={s.number}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.02, 0.4) }}
                className={cn(
                  "glass rounded-2xl p-3.5 glow-hover group relative overflow-hidden",
                  isCur && "border-teal-300/60 shadow-[0_0_24px_rgba(143,191,154,0.25)]"
                )}
              >
                {isCur && <span className="absolute top-0 inset-x-8 h-px bg-gradient-to-l from-transparent via-teal-300 to-transparent" />}
                <div className="flex items-center gap-3">
                  {badge(s.number)}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-quran text-[19px] leading-snug text-[#f6efdf] truncate">سورة {s.name}</h3>
                    <p className="text-[11.5px] text-teal-100/55 font-tajawal mt-0.5 truncate">{s.englishName} • {s.numberOfAyahs} آية</p>
                  </div>
                  {isCur ? <Equalizer playing={p.isPlaying} /> : <FavHeart active={fav} onToggle={(e) => { e.stopPropagation(); p.onToggleFav(s.number); }} size={16} />}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className={cn(
                    "text-[11px] font-bold px-2.5 py-1 rounded-full border",
                    makki ? "bg-teal-400/10 border-teal-300/25 text-teal-200" : "bg-amber-400/10 border-amber-300/25 text-amber-200"
                  )}>
                    {makki ? "مكية" : "مدنية"}
                  </span>
                  <div className="flex-1" />
                  <button
                    onClick={() => p.onPlay(s.number)}
                    className={cn(
                      "h-8 px-3 rounded-lg text-[12px] font-bold flex items-center gap-1.5 active:scale-90 transition-all",
                      isCur ? "bg-teal-400/20 text-teal-100 border border-teal-300/40" : "bg-gradient-to-l from-teal-400 to-teal-600 text-[#16221a] shadow-[0_0_14px_rgba(143,191,154,0.3)] hover:shadow-[0_0_20px_rgba(143,191,154,0.5)]"
                    )}
                  >
                    <Play size={13} fill="currentColor" /> استماع
                  </button>
                  <button
                    onClick={() => p.onRead(s.number)}
                    className="h-8 px-3 rounded-lg text-[12px] font-bold border border-teal-300/25 text-teal-100 bg-white/[0.03] hover:bg-teal-400/10 flex items-center gap-1.5 active:scale-90 transition-all"
                  >
                    <BookOpen size={13} /> قراءة
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
