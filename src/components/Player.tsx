import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Pause, Play, SkipBack, SkipForward, Volume2, VolumeX,
  Repeat, Repeat1, Download, ChevronDown, Gauge, X,
  HardDriveDownload, CheckCircle2, WifiOff, Loader2,
} from "lucide-react";
import { Equalizer } from "./shared";
import { cn } from "../utils/cn";

export interface Track {
  surahNumber: number;
  surahName: string;
  reciterName: string;
  reciterId: number;
  moshafName: string;
  moshafId: number;
  url: string;
  key: string;
}

export type SaveState = "idle" | "saving" | "saved" | "error";

interface Props {
  track: Track | null;
  playUrl: string;
  isCached: boolean;
  saveState: SaveState;
  savePct: number | null;
  onSave: () => void;
  queue: number[];
  surahNameOf: (n: number) => string;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onEndedAuto: () => void;
  autoplay: boolean;
  onToggleAutoplay: () => void;
}

function fmt(t: number) {
  if (!isFinite(t) || isNaN(t)) return "00:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const audioSingleton: { el: HTMLAudioElement | null } = { el: null };
export function getAudio(): HTMLAudioElement {
  if (!audioSingleton.el) {
    audioSingleton.el = new Audio();
    audioSingleton.el.preload = "metadata";
  }
  return audioSingleton.el;
}

export default function Player({ track, playUrl, isCached, saveState, savePct, onSave, queue: _queue, surahNameOf: _sn, onNext, onPrev, onClose, onEndedAuto, autoplay, onToggleAutoplay }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [repeat, setRepeat] = useState<0 | 1 | 2>(0); // 0 off, 1 all, 2 one
  const [speed, setSpeed] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioError, setAudioError] = useState(false);

  void _queue; void _sn;

  useEffect(() => {
    const a = getAudio();
    audioRef.current = a;
    const onPlay = () => { setPlaying(true); setAudioError(false); };
    const onPause = () => setPlaying(false);
    const onTime = () => setCur(a.currentTime);
    const onMeta = () => setDur(a.duration || 0);
    const onWait = () => setLoading(true);
    const onCan = () => setLoading(false);
    const onErr = () => {
      setLoading(false);
      setPlaying(false);
      if (track && !isCachedRef.current && typeof navigator !== "undefined" && navigator.onLine === false) {
        setAudioError(true);
      }
    };
    const onEnd = () => {
      if (repeat === 2) {
        a.currentTime = 0;
        a.play().catch(() => {});
      } else if (autoplay) {
        onEndedAuto();
      } else {
        setPlaying(false);
      }
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("waiting", onWait);
    a.addEventListener("canplay", onCan);
    a.addEventListener("error", onErr);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("waiting", onWait);
      a.removeEventListener("canplay", onCan);
      a.removeEventListener("error", onErr);
      a.removeEventListener("ended", onEnd);
    };
  }, [onEndedAuto, repeat, track, autoplay]);

  const isCachedRef = useRef(isCached);
  isCachedRef.current = isCached;

  useEffect(() => {
    const a = getAudio();
    if (!track || !playUrl) {
      if (!track) a.pause();
      return;
    }
    if (a.src !== playUrl) {
      setLoading(true);
      setAudioError(false);
      setCur(0);
      setDur(0);
      a.src = playUrl;
      a.playbackRate = speed;
      a.play().catch(() => setPlaying(false));
    } else if (a.paused && !audioError) {
      a.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playUrl, track?.key]);

  useEffect(() => {
    getAudio().playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const a = getAudio();
    a.volume = muted ? 0 : vol;
  }, [vol, muted]);

  const toggle = () => {
    const a = getAudio();
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const seek = (v: number) => {
    const a = getAudio();
    a.currentTime = v;
    setCur(v);
  };

  const pct = dur ? (cur / dur) * 100 : 0;

  return (
    <AnimatePresence>
      {track && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="fixed bottom-[70px] md:bottom-0 inset-x-0 z-[70] px-2 sm:px-4 pb-2 sm:pb-4"
        >
          <div className="max-w-5xl mx-auto">
            <div className="glass-strong rounded-2xl shadow-[0_-8px_50px_rgba(0,0,0,0.55),0_0_30px_rgba(143,191,154,0.12)] overflow-hidden">
              {/* seek top line */}
              <div className="relative h-1.5 bg-white/5 group">
                <div
                  className="absolute inset-y-0 right-0 bg-gradient-to-l from-teal-300 to-teal-600"
                  style={{ width: `${pct}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={dur || 0}
                  step={0.5}
                  value={cur}
                  onChange={(e) => seek(Number(e.target.value))}
                  className="seek absolute inset-0 w-full opacity-0 group-hover:opacity-100 transition-opacity h-full cursor-pointer"
                  style={{ background: "transparent" }}
                />
              </div>

              <div className="px-3 sm:px-5 py-3 flex items-center gap-3">
                {/* art */}
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="relative shrink-0 w-12 h-12 rounded-xl grid place-items-center bg-gradient-to-br from-teal-400/25 to-teal-900/40 border border-teal-300/30 active:scale-90 transition-transform overflow-hidden"
                >
                  <span className="font-quran text-xl text-teal-100 leading-none">
                    {String(track.surahNumber).padStart(2, "0")}
                  </span>
                  {loading && (
                    <span className="absolute inset-0 bg-black/40 grid place-items-center">
                      <span className="w-5 h-5 rounded-full border-2 border-teal-300 border-t-transparent animate-spin" />
                    </span>
                  )}
                </button>

                {/* meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Equalizer playing={playing} />
                    <p className="font-amiri font-bold text-[15px] text-[#f6efdf] truncate">
                      سورة {track.surahName}
                    </p>
                    {isCached && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/15 border border-emerald-300/40 text-emerald-200">
                        <WifiOff size={10} /> بدون نت
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-teal-100/60 truncate font-tajawal mt-0.5">
                    {track.reciterName} • {track.moshafName}
                  </p>
                  <p className="text-[11px] text-teal-100/50 font-tajawal tabular-nums mt-0.5" dir="ltr">
                    {fmt(cur)} / {fmt(dur)}
                  </p>
                  {audioError && (
                    <p className="text-[11px] font-bold text-amber-200 mt-1">لا يوجد اتصال — حمّل السورة أثناء الاتصال بالإنترنت لتشغيلها لاحقاً بدون نت</p>
                  )}
                </div>

                {/* controls */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <button onClick={onPrev} className="w-9 h-9 grid place-items-center rounded-full text-teal-100/80 hover:bg-teal-400/10 hover:text-teal-100 active:scale-90 transition-all" aria-label="السابق">
                    <SkipBack size={19} />
                  </button>
                  <button
                    onClick={toggle}
                    className="w-12 h-12 grid place-items-center rounded-full bg-gradient-to-br from-teal-300 to-teal-600 text-[#16221a] shadow-[0_0_22px_rgba(143,191,154,0.5)] hover:shadow-[0_0_30px_rgba(143,191,154,0.7)] active:scale-90 transition-all"
                    aria-label="تشغيل/إيقاف"
                  >
                    {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="-scale-x-100 translate-x-[1px]" />}
                  </button>
                  <button onClick={onNext} className="w-9 h-9 grid place-items-center rounded-full text-teal-100/80 hover:bg-teal-400/10 hover:text-teal-100 active:scale-90 transition-all" aria-label="التالي">
                    <SkipForward size={19} />
                  </button>
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className="grid w-9 h-9 place-items-center rounded-full text-teal-100/60 hover:bg-white/5 active:scale-90 transition-all"
                    aria-label="توسيع"
                  >
                    <ChevronDown size={18} className={cn("transition-transform", expanded && "rotate-180")} />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-2 pt-2 border-t border-teal-300/10">
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <span className="text-[11px] tabular-nums text-teal-100/60 font-tajawal" dir="ltr">{fmt(cur)}</span>
                        <input
                          type="range" min={0} max={dur || 0} step={0.5} value={cur}
                          onChange={(e) => seek(Number(e.target.value))}
                          className="seek flex-1"
                          style={{ ["--fill" as string]: `${pct}%` }}
                        />
                        <span className="text-[11px] tabular-nums text-teal-100/60 font-tajawal" dir="ltr">{fmt(dur)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                        <button onClick={() => setMuted((m) => !m)} className="text-teal-200/80 hover:text-teal-100 active:scale-90 transition-all" aria-label="كتم">
                          {muted || vol === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                        </button>
                        <input
                          type="range" min={0} max={1} step={0.05} value={muted ? 0 : vol}
                          onChange={(e) => { setVol(Number(e.target.value)); setMuted(false); }}
                          className="seek flex-1"
                          style={{ ["--fill" as string]: `${(muted ? 0 : vol) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={onToggleAutoplay}
                          title="تشغيل السورة التالية تلقائياً"
                          className={cn(
                            "h-8 px-2.5 rounded-lg border text-[12px] font-bold flex items-center gap-1 active:scale-90 transition-all",
                            autoplay ? "border-teal-300/40 bg-teal-400/10 text-teal-200" : "border-white/10 text-slate-400"
                          )}
                        >
                          <SkipForward size={14} /> تلقائي
                        </button>
                        <button
                          onClick={() => setRepeat((r) => ((r + 1) % 3) as 0 | 1 | 2)}
                          title="تكرار"
                          className={cn(
                            "h-8 px-2.5 rounded-lg border text-[12px] font-bold flex items-center gap-1 active:scale-90 transition-all",
                            repeat === 0 ? "border-white/10 text-slate-400" : "border-teal-300/40 bg-teal-400/10 text-teal-200 shadow-[0_0_12px_rgba(143,191,154,0.25)]"
                          )}
                        >
                          {repeat === 2 ? <Repeat1 size={15} /> : <Repeat size={15} />}
                          {repeat === 0 ? "بدون تكرار" : repeat === 1 ? "تكرار الكل" : "تكرار السورة"}
                        </button>
                        <button
                          onClick={() => setSpeed((s) => (s === 1 ? 1.25 : s === 1.25 ? 1.5 : s === 1.5 ? 2 : 1))}
                          className="h-8 px-2.5 rounded-lg border border-white/10 text-[12px] font-bold text-teal-100/80 hover:border-teal-300/40 flex items-center gap-1 active:scale-90 transition-all"
                        >
                          <Gauge size={14} /> {speed}x
                        </button>
                        <a
                          href={track.url}
                          download={`surah-${track.surahNumber}.mp3`}
                          target="_blank"
                          rel="noreferrer"
                          className="h-8 px-3 rounded-lg bg-teal-500/15 border border-teal-300/30 text-teal-100 text-[12px] font-bold flex items-center gap-1.5 hover:bg-teal-500/25 active:scale-90 transition-all"
                        >
                          <Download size={14} /> MP3
                        </a>
                        {isCached || saveState === "saved" ? (
                          <span className="h-8 px-3 rounded-lg bg-emerald-400/12 border border-emerald-300/40 text-emerald-200 text-[12px] font-bold flex items-center gap-1.5">
                            <CheckCircle2 size={14} /> محفوظة بدون نت
                          </span>
                        ) : saveState === "saving" ? (
                          <span className="h-8 px-3 rounded-lg bg-teal-400/10 border border-teal-300/30 text-teal-100 text-[12px] font-bold flex items-center gap-1.5">
                            <Loader2 size={14} className="animate-spin" /> {savePct !== null ? `${savePct}٪` : "جارٍ الحفظ..."}
                          </span>
                        ) : (
                          <button
                            onClick={onSave}
                            className="h-8 px-3 rounded-lg bg-amber-300/12 border border-amber-200/35 text-amber-100 text-[12px] font-bold flex items-center gap-1.5 hover:bg-amber-300/20 active:scale-90 transition-all"
                            title="حفظ السورة على الجهاز للاستماع بدون إنترنت"
                          >
                            <HardDriveDownload size={14} /> حفظ بدون نت
                          </button>
                        )}
                        <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg border border-white/10 text-slate-400 hover:text-rose-300 hover:border-rose-300/40 active:scale-90 transition-all" aria-label="إغلاق">
                          <X size={15} />
                        </button>
                      </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
