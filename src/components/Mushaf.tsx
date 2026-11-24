import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpenText, Copy, Check, Play, Pause, ChevronRight, ChevronLeft, ALargeSmall, Eye, EyeOff, Loader2 } from "lucide-react";
import type { Ayah, SurahMeta } from "../lib/api";
import { cn } from "../utils/cn";

interface Props {
  surahs: SurahMeta[];
  surahNumber: number;
  setSurahNumber: (n: number) => void;
  ayahs: Ayah[];
  tafsir: Ayah[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  fontSize: number;
  setFontSize: (n: number) => void;
  showTafsir: boolean;
  setShowTafsir: (v: boolean) => void;
  onPlaySurah: (n: number) => void;
  playingSurah: number | null;
  isPlaying: boolean;
}

function toAr(n: number): string {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

export default function Mushaf(p: Props) {
  const [openAyah, setOpenAyah] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const meta = useMemo(() => p.surahs.find((s) => s.number === p.surahNumber), [p.surahs, p.surahNumber]);
  const tafsirMap = useMemo(() => {
    const m = new Map<number, string>();
    p.tafsir.forEach((a) => m.set(a.numberInSurah, a.text));
    return m;
  }, [p.tafsir]);

  const copyAyah = async (a: Ayah) => {
    const t = tafsirMap.get(a.numberInSurah) || "";
    const txt = `﴿${a.text}﴾ [${meta?.name} : ${a.numberInSurah}]\n\nالتفسير الميسر:\n${t}`;
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(a.numberInSurah);
    setTimeout(() => setCopied(null), 1600);
  };

  const isCurPlaying = p.playingSurah === p.surahNumber;

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-4 items-start">
      {/* surah index */}
      <div className="glass rounded-2xl overflow-hidden lg:sticky lg:top-[132px]">
        <div className="px-4 py-3 border-b border-teal-300/10 flex items-center gap-2">
          <BookOpenText size={16} className="text-teal-300" />
          <span className="text-[13px] font-bold text-teal-50">فهرس السور</span>
        </div>
        <div className="max-h-[300px] lg:max-h-[560px] overflow-y-auto p-2 space-y-1">
          {p.surahs.map((s) => (
            <button
              key={s.number}
              onClick={() => { p.setSurahNumber(s.number); setOpenAyah(null); }}
              className={cn(
                "w-full flex items-center gap-2.5 p-2 rounded-xl border text-right active:scale-[0.98] transition-all",
                s.number === p.surahNumber
                  ? "bg-teal-400/12 border-teal-300/50 shadow-[0_0_14px_rgba(143,191,154,0.2)]"
                  : "border-transparent hover:bg-white/[0.04]"
              )}
            >
              <span className="w-8 h-8 shrink-0 grid place-items-center rounded-lg bg-white/[0.04] border border-white/10 text-[12px] font-bold text-teal-200 tabular-nums">{s.number}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-quran text-[15px] text-[#f6efdf] truncate">{s.name}</span>
                <span className="block text-[10.5px] text-teal-100/45 font-tajawal">{s.numberOfAyahs} آية</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* reading pane */}
      <div className="glass-strong rounded-3xl overflow-hidden relative">
        {/* ornate header */}
        <div className="relative px-5 pt-6 pb-5 text-center border-b border-teal-300/15 bg-gradient-to-b from-teal-400/[0.07] to-transparent overflow-hidden">
          <div className="absolute inset-0 islamic-pattern opacity-60 pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-3 px-8 py-2.5 rounded-2xl border border-amber-200/25 bg-gradient-to-b from-amber-100/[0.06] to-transparent shadow-[0_0_24px_rgba(217,174,95,0.08)]">
              <svg width="26" height="26" viewBox="0 0 24 24" className="text-teal-300"><path fill="currentColor" d="M12 2l2.4 4.9 4.9 2.4-4.9 2.4L12 16.6l-2.4-4.9-4.9-2.4 4.9-2.4z" opacity=".9"/><path fill="currentColor" d="M19 15l1.2 2.4 2.4 1.2-2.4 1.2L19 22.2l-1.2-2.4-2.4-1.2 2.4-1.2z" opacity=".6"/></svg>
              <h2 className="font-quran text-[26px] md:text-[30px] text-[#f6efdf] leading-none">سورة {meta?.name || "..."}</h2>
              <svg width="26" height="26" viewBox="0 0 24 24" className="text-teal-300 -scale-x-100"><path fill="currentColor" d="M12 2l2.4 4.9 4.9 2.4-4.9 2.4L12 16.6l-2.4-4.9-4.9-2.4 4.9-2.4z" opacity=".9"/><path fill="currentColor" d="M19 15l1.2 2.4 2.4 1.2-2.4 1.2L19 22.2l-1.2-2.4-2.4-1.2 2.4-1.2z" opacity=".6"/></svg>
            </div>
            <p className="mt-2.5 text-[12.5px] text-teal-100/60 font-tajawal">
              {meta?.revelationType.includes("Meccan") ? "مكية" : "مدنية"} • {meta?.numberOfAyahs} آية • الجزء يُعرض تلقائياً
            </p>
            {/* controls */}
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={() => p.setSurahNumber(Math.max(1, p.surahNumber - 1))}
                disabled={p.surahNumber <= 1}
                className="h-9 w-9 grid place-items-center rounded-xl border border-teal-300/25 text-teal-100 hover:bg-teal-400/10 disabled:opacity-30 active:scale-90 transition-all"
                aria-label="السابق"
              >
                <ChevronRight size={17} />
              </button>
              <button
                onClick={() => p.onPlaySurah(p.surahNumber)}
                className="h-9 px-4 rounded-xl bg-gradient-to-l from-teal-400 to-teal-600 text-[#16221a] text-[13px] font-bold flex items-center gap-1.5 shadow-[0_0_18px_rgba(143,191,154,0.35)] active:scale-95 transition-all"
              >
                {isCurPlaying && p.isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                {isCurPlaying && p.isPlaying ? "إيقاف مؤقت" : "استماع للسورة"}
              </button>
              <button
                onClick={() => p.setSurahNumber(Math.min(114, p.surahNumber + 1))}
                disabled={p.surahNumber >= 114}
                className="h-9 w-9 grid place-items-center rounded-xl border border-teal-300/25 text-teal-100 hover:bg-teal-400/10 disabled:opacity-30 active:scale-90 transition-all"
                aria-label="التالي"
              >
                <ChevronLeft size={17} />
              </button>
              <span className="w-px h-6 bg-teal-300/15 mx-1 hidden sm:block" />
              <div className="flex items-center gap-1">
                <button onClick={() => p.setFontSize(Math.max(18, p.fontSize - 2))} className="h-9 px-2.5 rounded-xl border border-teal-300/25 text-teal-100 text-[13px] font-bold hover:bg-teal-400/10 active:scale-90 transition-all">A-</button>
                <button onClick={() => p.setFontSize(Math.min(44, p.fontSize + 2))} className="h-9 px-2.5 rounded-xl border border-teal-300/25 text-teal-100 text-[13px] font-bold hover:bg-teal-400/10 active:scale-90 transition-all flex items-center gap-1"><ALargeSmall size={15} /> A+</button>
              </div>
              <button
                onClick={() => p.setShowTafsir(!p.showTafsir)}
                className={cn(
                  "h-9 px-3.5 rounded-xl text-[12.5px] font-bold border flex items-center gap-1.5 active:scale-95 transition-all",
                  p.showTafsir ? "bg-amber-300/15 border-amber-200/40 text-amber-100 shadow-[0_0_14px_rgba(217,174,95,0.25)]" : "border-teal-300/25 text-teal-100 hover:bg-teal-400/10"
                )}
              >
                {p.showTafsir ? <EyeOff size={14} /> : <Eye size={14} />} عرض التفسير
              </button>
            </div>
          </div>
        </div>

        {/* body */}
        <div className="px-4 sm:px-8 py-6 relative">
          <div className="absolute inset-0 islamic-pattern opacity-40 pointer-events-none" />
          {p.loading ? (
            <div className="relative space-y-3 py-6">
              <div className="flex justify-center"><Loader2 className="animate-spin text-teal-300" size={26} /></div>
              <div className="skeleton h-6 rounded-xl" />
              <div className="skeleton h-6 rounded-xl w-11/12" />
              <div className="skeleton h-6 rounded-xl w-10/12" />
              <div className="skeleton h-6 rounded-xl w-full" />
              <p className="text-center text-[12px] text-teal-100/50 font-tajawal pt-2">جارٍ تحميل النص العثماني والتفسير الميسر...</p>
            </div>
          ) : p.error ? (
            <div className="relative text-center py-10">
              <p className="font-amiri text-lg text-rose-200">تعذّر تحميل السورة</p>
              <button onClick={p.onRetry} className="mt-3 px-5 py-2 rounded-xl bg-teal-500/15 border border-teal-300/30 text-teal-100 text-sm font-bold">إعادة المحاولة</button>
            </div>
          ) : (
            <div className="relative">
              {p.surahNumber !== 1 && p.surahNumber !== 9 && (
                <p className="text-center font-quran text-[24px] text-teal-100/90 mb-6">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
              )}
              <div className="quran-text text-justify" style={{ fontSize: p.fontSize }}>
                {p.ayahs.map((a) => (
                  <span key={a.number}>
                    <button
                      onClick={() => setOpenAyah(openAyah === a.numberInSurah ? null : a.numberInSurah)}
                      title="اضغط لعرض التفسير"
                      className={cn(
                        "rounded-md px-0.5 transition-all duration-200 hover:bg-teal-400/10 hover:shadow-[0_0_12px_rgba(143,191,154,0.2)] active:scale-[0.99]",
                        openAyah === a.numberInSurah && "bg-teal-400/10 shadow-[0_0_12px_rgba(143,191,154,0.25)]"
                      )}
                    >
                      {a.text}
                    </button>{" "}
                    <button
                      onClick={() => setOpenAyah(openAyah === a.numberInSurah ? null : a.numberInSurah)}
                      className="ayah-marker whitespace-nowrap font-bold hover:scale-110 inline-block transition-transform active:scale-95"
                      style={{ fontSize: p.fontSize * 0.9 }}
                    >
                      ۝{toAr(a.numberInSurah)}
                    </button>{" "}
                  </span>
                ))}
              </div>

              {/* expandable tafsir */}
              <AnimatePresence>
                {(openAyah !== null || p.showTafsir) && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 16 }}
                    className="mt-6 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-teal-300/30 to-transparent" />
                      <span className="text-[13px] font-bold text-amber-200 font-amiri whitespace-nowrap px-2">التفسير الميسر</span>
                      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-teal-300/30 to-transparent" />
                    </div>
                    {(openAyah !== null
                      ? p.ayahs.filter((a) => a.numberInSurah === openAyah)
                      : p.ayahs
                    ).map((a) => (
                      <motion.div
                        key={a.number}
                        layout
                        className={cn(
                          "rounded-2xl border p-4",
                          openAyah === a.numberInSurah
                            ? "bg-teal-400/[0.07] border-teal-300/40 shadow-[0_0_20px_rgba(143,191,154,0.15)]"
                            : "bg-black/20 border-teal-300/15"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11.5px] font-bold text-teal-300 bg-teal-400/10 border border-teal-300/25 rounded-full px-2.5 py-1 whitespace-nowrap">
                            الآية {toAr(a.numberInSurah)}
                          </span>
                          <button
                            onClick={() => copyAyah(a)}
                            className="h-8 px-3 rounded-lg text-[11.5px] font-bold border border-white/10 text-teal-100/70 hover:border-teal-300/40 hover:text-teal-100 flex items-center gap-1.5 active:scale-90 transition-all"
                          >
                            {copied === a.numberInSurah ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
                            {copied === a.numberInSurah ? "تم النسخ" : "نسخ الآية والتفسير"}
                          </button>
                        </div>
                        <p className="font-quran text-[17px] leading-[2.2] text-[#f6efdf] mt-2.5">﴿{a.text}﴾</p>
                        <p className="font-amiri text-[14.5px] leading-[2.1] text-teal-50/85 mt-2 border-r-2 border-amber-200/40 pr-3">
                          {tafsirMap.get(a.numberInSurah) || "جارٍ تحميل التفسير..."}
                        </p>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
