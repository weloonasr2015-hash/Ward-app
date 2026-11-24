import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sunrise, Sunset, RotateCcw, Check, Sparkles, BookMarked } from "lucide-react";
import { morningAdhkar, eveningAdhkar } from "../data/adhkar";
import { cn } from "../utils/cn";

interface Props {
  progress: Record<string, number>;
  onProgress: (next: Record<string, number>) => void;
}

function toAr(n: number) {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

export default function Adhkar({ progress, onProgress }: Props) {
  const [tab, setTab] = useState<"morning" | "evening">(() => {
    const h = new Date().getHours();
    return h >= 4 && h < 17 ? "morning" : "evening";
  });
  const [ripples, setRipples] = useState<Record<string, number>>({});

  const list = tab === "morning" ? morningAdhkar : eveningAdhkar;

  const stats = useMemo(() => {
    let done = 0;
    list.forEach((d) => {
      const left = progress[d.id] ?? d.count;
      if (left <= 0) done++;
    });
    return { done, total: list.length, pct: Math.round((done / list.length) * 100) };
  }, [list, progress]);

  const tap = (id: string, total: number, e: React.MouseEvent) => {
    const left = progress[id] ?? total;
    if (left <= 0) return;
    setRipples((r) => ({ ...r, [id]: Date.now() }));
    onProgress({ ...progress, [id]: left - 1 });
    void e;
  };

  const reset = () => {
    const next = { ...progress };
    list.forEach((d) => delete next[d.id]);
    onProgress(next);
  };

  return (
    <div>
      {/* toggle + progress */}
      <div className="glass rounded-2xl p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex p-1 rounded-2xl bg-black/30 border border-teal-300/15">
            {([
              ["morning", "أذكار الصباح", Sunrise],
              ["evening", "أذكار المساء", Sunset],
            ] as const).map(([v, label, Icon]) => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className={cn(
                  "h-10 px-5 rounded-xl text-[13.5px] font-bold flex items-center gap-2 active:scale-95 transition-all duration-200",
                  tab === v
                    ? "bg-gradient-to-l from-teal-400 to-teal-600 text-[#16221a] shadow-[0_0_18px_rgba(143,191,154,0.4)]"
                    : "text-teal-100/60 hover:text-teal-100"
                )}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[160px]">
            <div className="flex justify-between text-[11.5px] font-bold text-teal-100/60 mb-1.5">
              <span>التقدم: {toAr(stats.done)} / {toAr(stats.total)}</span>
              <span className="tabular-nums">{stats.pct}٪</span>
            </div>
            <div className="h-2.5 rounded-full bg-black/40 border border-teal-300/15 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-l from-teal-300 via-teal-400 to-emerald-400 shadow-[0_0_12px_rgba(143,191,154,0.6)]"
                animate={{ width: `${stats.pct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
          <button
            onClick={reset}
            className="h-10 px-4 rounded-xl border border-white/10 text-[12.5px] font-bold text-slate-300 hover:border-teal-300/40 hover:text-teal-100 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <RotateCcw size={14} /> إعادة
          </button>
        </div>
        {stats.pct === 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 rounded-xl border border-amber-200/30 bg-amber-300/[0.07] px-4 py-2.5 flex items-center gap-2 text-amber-100 text-[13px] font-bold"
          >
            <Sparkles size={16} className="text-amber-300" />
            ما شاء الله! أتممت {tab === "morning" ? "أذكار الصباح" : "أذكار المساء"} — تقبّل الله منك وجعلك في حفظه
          </motion.div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3.5">
        <AnimatePresence mode="popLayout">
          {list.map((d, i) => {
            const left = progress[d.id] ?? d.count;
            const done = left <= 0;
            const did = d.count - left;
            const pct = d.count > 1 ? (did / d.count) * 100 : done ? 100 : 0;
            return (
              <motion.button
                key={tab + d.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                onClick={(e) => tap(d.id, d.count, e)}
                className={cn(
                  "relative text-right rounded-2xl border p-4 sm:p-5 overflow-hidden active:scale-[0.985] transition-all duration-200 group",
                  done
                    ? "bg-teal-400/[0.09] border-teal-300/60 shadow-[0_0_24px_rgba(143,191,154,0.25)]"
                    : "glass hover:border-teal-300/40"
                )}
              >
                {/* ripple */}
                {ripples[d.id] && (
                  <span key={ripples[d.id]} className="ripple-ring pointer-events-none absolute w-24 h-24 rounded-full bg-teal-300/25 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" />
                )}
                <div className="flex items-start gap-3">
                  {/* counter */}
                  <span className="relative shrink-0">
                    <svg width="62" height="62" viewBox="0 0 62 62" className="-rotate-90">
                      <circle cx="31" cy="31" r="26" fill="none" stroke="rgba(143,191,154,0.15)" strokeWidth="5" />
                      <motion.circle
                        cx="31" cy="31" r="26" fill="none"
                        stroke={done ? "#34d399" : "#8fbf9a"}
                        strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 26}
                        animate={{ strokeDashoffset: 2 * Math.PI * 26 * (1 - pct / 100) }}
                        transition={{ type: "spring", stiffness: 120, damping: 20 }}
                        style={{ filter: "drop-shadow(0 0 6px rgba(143,191,154,0.6))" }}
                      />
                    </svg>
                    <span className="absolute inset-0 grid place-items-center">
                      {done ? (
                        <span className="w-9 h-9 rounded-full grid place-items-center bg-gradient-to-br from-teal-300 to-emerald-500 text-[#16221a] shadow-[0_0_16px_rgba(143,191,154,0.6)]">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path className="draw-check" d="M4 12.5l5 5L20 6.5" /></svg>
                        </span>
                      ) : (
                        <span className="text-center leading-none">
                          <span className="block font-tajawal font-800 font-bold text-[16px] text-teal-50 tabular-nums">{toAr(left)}</span>
                          <span className="block text-[9.5px] text-teal-100/50 font-bold mt-0.5">متبقٍ</span>
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2 mb-1.5">
                      <BookMarked size={13} className="text-teal-300/70 shrink-0" />
                      <span className="text-[11px] font-bold text-teal-200/70">الذكر {toAr(i + 1)} • يُقال {toAr(d.count)} {d.count === 1 ? "مرة" : "مرات"}</span>
                      {done && <span className="ms-auto text-[10.5px] font-bold text-emerald-300 flex items-center gap-1"><Check size={12} /> تم</span>}
                    </span>
                    <span className={cn("block font-amiri text-[16.5px] leading-[2.15]", done ? "text-teal-50/75" : "text-[#f6efdf]")}>{d.text}</span>
                    <span className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-300/10 border border-amber-200/25 text-amber-100/90">الفضل: {d.virtue}</span>
                      <span className="text-[10.5px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-300/80">{d.source}</span>
                    </span>
                  </span>
                </div>
                {!done && d.count > 1 && (
                  <span className="mt-3 flex gap-1">
                    {Array.from({ length: d.count }).map((_, k) => (
                      <span key={k} className={cn("h-1.5 flex-1 rounded-full transition-all duration-300", k < did ? "bg-teal-300 shadow-[0_0_8px_rgba(143,191,154,0.6)]" : "bg-white/10")} />
                    ))}
                  </span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
