import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic2, Play, ChevronDown, Crown, Star, Globe2, BadgeCheck, HardDriveDownload, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { parseSurahList, isEgyptian, isFamous, sortReciters, normAr, type Reciter } from "../lib/api";
import { vaultKey } from "../lib/audioVault";
import { Equalizer, FavHeart, ErrorBox } from "./shared";
import { cn } from "../utils/cn";

interface Props {
  reciters: Reciter[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  search: string;
  favReciters: Set<number>;
  onToggleFav: (id: number) => void;
  selectedReciter: Reciter | null;
  setSelectedReciter: (r: Reciter) => void;
  selectedMoshafIdx: number;
  setSelectedMoshafIdx: (i: number) => void;
  onPlaySurah: (reciter: Reciter, moshafIdx: number, surah: number) => void;
  playingReciterId: number | null;
  playingSurah: number | null;
  isPlaying: boolean;
  surahNameOf: (n: number) => string;
  savedKeys: Set<string>;
  online: boolean;
  onSaveSurah: (reciter: Reciter, moshafIdx: number, surah: number) => Promise<boolean>;
}

type Cat = "all" | "egypt" | "famous" | "fav";

export default function Reciters(p: Props) {
  const [cat, setCat] = useState<Cat>("all");
  const [surahQ, setSurahQ] = useState("");
  const [showAllSurahs, setShowAllSurahs] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const saveOne = async (e: React.MouseEvent, r: Reciter, mi: number, n: number) => {
    e.stopPropagation();
    const m = r.moshaf[mi] ?? r.moshaf[0];
    if (!m) return;
    const key = vaultKey(r.id, m.id, n);
    if (p.savedKeys.has(key) || savingKey) return;
    setSavingKey(key);
    try {
      await p.onSaveSurah(r, mi, n);
    } finally {
      setSavingKey(null);
    }
  };

  const sorted = useMemo(() => sortReciters(p.reciters), [p.reciters]);

  const filtered = useMemo(() => {
    const q = normAr(p.search.trim());
    return sorted.filter((r) => {
      if (cat === "egypt" && !isEgyptian(r.name)) return false;
      if (cat === "famous" && !isFamous(r.name)) return false;
      if (cat === "fav" && !p.favReciters.has(r.id)) return false;
      if (q && !normAr(r.name).includes(q)) return false;
      return true;
    });
  }, [sorted, cat, p.search, p.favReciters]);

  const sel = p.selectedReciter;
  const moshaf = sel ? sel.moshaf[p.selectedMoshafIdx] ?? sel.moshaf[0] : null;
  const available = moshaf ? parseSurahList(moshaf.surah_list) : [];
  const visibleSurahs = (showAllSurahs ? available : available.slice(0, 24)).filter((n) => {
    if (!surahQ.trim()) return true;
    return p.surahNameOf(n).includes(surahQ.trim()) || String(n).includes(surahQ.trim());
  });

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-start">
      {/* list */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {([
            ["all", "الكل", Globe2],
            ["egypt", "دولة التلاوة المصرية", Crown],
            ["famous", "أشهر القراء العرب", Star],
            ["fav", "المفضلون", BadgeCheck],
          ] as [Cat, string, typeof Globe2][]).map(([v, label, Icon]) => (
            <button
              key={v}
              onClick={() => setCat(v)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[12px] font-bold border flex items-center gap-1.5 active:scale-90 transition-all",
                cat === v
                  ? "bg-gradient-to-l from-teal-400 to-teal-600 text-[#16221a] border-transparent shadow-[0_0_16px_rgba(143,191,154,0.4)]"
                  : "bg-white/[0.03] text-teal-100/70 border-teal-300/20 hover:border-teal-300/50"
              )}
            >
              <Icon size={13} /> {label}
              {v === "fav" && p.favReciters.size > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-current/10 grid place-items-center text-[11px] bg-black/20">{p.favReciters.size}</span>
              )}
            </button>
          ))}
        </div>

        <div className="glass rounded-2xl overflow-hidden max-h-[560px] flex flex-col">
          <div className="px-3.5 py-2.5 border-b border-teal-300/10 text-[12px] text-teal-100/50 font-bold flex justify-between">
            <span>{filtered.length} قارئ</span>
            <span>مرتّبون بالأحب والأشهر أولاً</span>
          </div>
          <div className="overflow-y-auto p-2 space-y-1.5">
            {p.loading ? (
              <div className="p-2 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton h-14 rounded-xl" />
                ))}
              </div>
            ) : p.error ? (
              <div className="p-3"><ErrorBox message="تعذّر تحميل القراء" onRetry={p.onRetry} /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 font-amiri text-teal-100/60">لا يوجد قراء مطابقون</p>
            ) : (
              filtered.map((r, idx) => {
                const active = sel?.id === r.id;
                const fav = p.favReciters.has(r.id);
                const top = idx < 3 && cat === "all";
                return (
                  <button
                    key={r.id}
                    onClick={() => { p.setSelectedReciter(r); p.setSelectedMoshafIdx(0); setShowAllSurahs(false); }}
                    className={cn(
                      "w-full text-right p-2.5 rounded-xl border flex items-center gap-2.5 active:scale-[0.98] transition-all duration-150 group",
                      active
                        ? "bg-teal-400/10 border-teal-300/50 shadow-[0_0_18px_rgba(143,191,154,0.2)]"
                        : "bg-transparent border-transparent hover:bg-white/[0.04] hover:border-teal-300/20"
                    )}
                  >
                    <span className={cn(
                      "shrink-0 w-10 h-10 rounded-xl grid place-items-center font-quran text-lg border",
                      active ? "bg-teal-400/20 border-teal-300/40 text-teal-100" : "bg-white/[0.04] border-white/10 text-teal-100/70 group-hover:border-teal-300/30"
                    )}>
                      {r.name.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="font-amiri font-bold text-[14.5px] text-[#f6efdf] truncate">{r.name}</span>
                        {top && <Crown size={13} className="text-amber-300 shrink-0" />}
                        {r.id === -1 && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-amber-300/15 border border-amber-200/40 text-amber-200">
                            <Sparkles size={10} /> مميز
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] text-teal-100/50 font-tajawal mt-0.5 truncate">
                        {r.moshaf.length} {r.moshaf.length > 1 ? "روايات" : "رواية"} • {r.moshaf[0]?.name}
                      </span>
                    </span>
                    {p.playingReciterId === r.id
                      ? <Equalizer playing={p.isPlaying} />
                      : (
                        <span onClick={(e) => { e.stopPropagation(); p.onToggleFav(r.id); }}>
                          <FavHeart active={fav} onToggle={(e) => { e.stopPropagation(); p.onToggleFav(r.id); }} size={14} />
                        </span>
                      )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* detail */}
      <div className="glass-strong rounded-2xl p-4 sm:p-5 min-h-[400px] relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        {!sel ? (
          <div className="h-full min-h-[340px] grid place-items-center text-center">
            <div>
              <Mic2 size={44} className="mx-auto text-teal-300/40 mb-4" />
              <p className="font-ruqaa text-2xl text-teal-50">اختر قارئاً لبدء الاستماع</p>
              <p className="text-[13px] text-teal-100/50 mt-2 font-tajawal">جميع قراء مصر والعالم العربي — اختر الرواية ثم السورة</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-start gap-3 flex-wrap">
              <span className="w-14 h-14 rounded-2xl grid place-items-center font-quran text-2xl bg-gradient-to-br from-teal-300/30 to-teal-800/40 border border-teal-300/40 text-teal-50 shadow-[0_0_20px_rgba(143,191,154,0.25)]">
                {sel.name.slice(0, 1)}
              </span>
              <div className="flex-1 min-w-[180px]">
                <h3 className="font-ruqaa text-[22px] text-[#f6efdf] leading-tight flex items-center gap-2 flex-wrap">
                  {sel.name}
                  {sel.id === -1 && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-tajawal font-bold px-2 py-1 rounded-full bg-amber-300/15 border border-amber-200/40 text-amber-200">
                      <Sparkles size={11} /> تسجيلات مختارة
                    </span>
                  )}
                </h3>
                <p className="text-[12px] text-teal-100/55 font-tajawal mt-1">
                  {sel.id === -1
                    ? `تلاوة هادئة بدون مؤثرات • ${available.length} سورة متاحة • تعمل وتُحمّل بدون نت`
                    : `حرف ${sel.letter} • ${available.length} سورة متاحة بهذه الرواية`}
                </p>
              </div>
              <FavHeart active={p.favReciters.has(sel.id)} onToggle={() => p.onToggleFav(sel.id)} />
            </div>

            {/* moshaf switch */}
            <p className="text-[12px] font-bold text-teal-100/60 mt-4 mb-2">الرواية / المصحف ({sel.moshaf.length}):</p>
            <div className="flex flex-wrap gap-2">
              {sel.moshaf.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => { p.setSelectedMoshafIdx(i); setShowAllSurahs(false); }}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-[12.5px] font-bold border active:scale-95 transition-all",
                    i === p.selectedMoshafIdx
                      ? "bg-gradient-to-l from-teal-400 to-teal-600 text-[#16221a] border-transparent shadow-[0_0_16px_rgba(143,191,154,0.4)]"
                      : "bg-white/[0.03] border-teal-300/20 text-teal-100/75 hover:border-teal-300/50"
                  )}
                >
                  {m.name}
                </button>
              ))}
            </div>

            {/* surah search */}
            <div className="mt-4 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  value={surahQ}
                  onChange={(e) => setSurahQ(e.target.value)}
                  placeholder="ابحث برقم أو اسم السورة داخل هذه الرواية..."
                  className="w-full h-10 rounded-xl bg-black/25 border border-teal-300/20 focus:border-teal-300/60 outline-none px-4 text-[13px] placeholder:text-teal-100/30 text-teal-50"
                />
              </div>
              <span className="text-[11.5px] text-teal-100/50 font-bold whitespace-nowrap">{available.length} سورة</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 mt-3 max-h-[420px] overflow-y-auto ps-0.5 pe-1 pb-1">
              <AnimatePresence initial={false}>
                {visibleSurahs.map((n) => {
                  const cur = p.playingReciterId === sel.id && p.playingSurah === n;
                  const m = sel.moshaf[p.selectedMoshafIdx] ?? sel.moshaf[0];
                  const key = m ? vaultKey(sel.id, m.id, n) : "";
                  const saved = key !== "" && p.savedKeys.has(key);
                  const saving = savingKey === key;
                  return (
                    <motion.div
                      key={n}
                      layout
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        "relative rounded-xl border transition-all group overflow-hidden",
                        cur
                          ? "bg-teal-400/15 border-teal-300/60 shadow-[0_0_16px_rgba(143,191,154,0.3)]"
                          : saved
                            ? "bg-emerald-400/[0.05] border-emerald-300/25 hover:border-emerald-300/50"
                            : "bg-white/[0.03] border-white/10 hover:border-teal-300/40 hover:bg-teal-400/[0.07]"
                      )}
                    >
                      <button
                        onClick={() => p.onPlaySurah(sel, p.selectedMoshafIdx, n)}
                        className="w-full p-2.5 text-right active:scale-[0.97] transition-transform"
                      >
                        <span className="flex items-center justify-between gap-1">
                          <span className="font-tajawal font-bold text-[12px] tabular-nums text-teal-200/80 flex items-center gap-1">
                            {n}
                            {saved && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.9)]" title="محفوظة بدون نت" />}
                          </span>
                          {cur ? <Equalizer playing={p.isPlaying} /> : <Play size={13} className="text-teal-300/50 group-hover:text-teal-200 group-hover:scale-110 transition-all" fill="currentColor" />}
                        </span>
                        <span className="block font-quran text-[15px] text-[#f6efdf] truncate mt-1">{p.surahNameOf(n)}</span>
                      </button>
                      {p.online && !saved && (
                        <button
                          onClick={(e) => saveOne(e, sel, p.selectedMoshafIdx, n)}
                          title="حفظ للاستماع بدون نت"
                          className="absolute bottom-1.5 left-1.5 w-7 h-7 grid place-items-center rounded-lg bg-black/40 border border-white/10 text-teal-200/60 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-teal-100 hover:border-teal-300/50 active:scale-90 transition-all"
                        >
                          {saving ? <Loader2 size={13} className="animate-spin" /> : <HardDriveDownload size={13} />}
                        </button>
                      )}
                      {saved && (
                        <span className="absolute bottom-1.5 left-1.5 text-emerald-300/90" title="محفوظة على جهازك — تعمل بدون نت">
                          <CheckCircle2 size={14} />
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            {!surahQ && available.length > 24 && (
              <button
                onClick={() => setShowAllSurahs((v) => !v)}
                className="mt-3 w-full h-10 rounded-xl border border-teal-300/25 text-teal-100 text-[13px] font-bold hover:bg-teal-400/10 flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
              >
                {showAllSurahs ? "عرض أقل" : `عرض كل السور (${available.length})`}
                <ChevronDown size={15} className={cn("transition-transform", showAllSurahs && "rotate-180")} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
