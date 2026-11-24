import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot, Send, X, Sparkles, Settings2, Trash2, Maximize2, Minimize2,
  Mic, KeyRound, ShieldCheck, Loader2, ChevronLeft, Wand2,
} from "lucide-react";
import {
  askMuslimSmart, DEFAULT_AI_CONFIG,
  type AIConfig, type AssistantAction, type AssistantContext,
} from "../lib/assistant";
import { cn } from "../utils/cn";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions?: AssistantAction[];
  time: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  ctx: AssistantContext;
  onAction: (a: AssistantAction) => void;
  aiConfig: AIConfig;
  setAiConfig: (c: AIConfig) => void;
  online: boolean;
  messages: ChatMessage[];
  setMessages: (m: ChatMessage[]) => void;
  onNewReminder?: (title: string, body: string, dueAt: number, repeat: "once" | "daily" | "weekly") => boolean;
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text:
    "السلام عليكم ورحمة الله 🤍\nأنا **مُسلم**، رفيقك داخل **وِرْد**.\n\nاضبط لنفسك وِرداً، أذكّرك بالصلاة والصيام والصلاة على النبي، وأشغّل لك القرآن أو أفتح التفسير — وكل ده بدون نت.\n\nاكتب طلبك أو اضغط على أحد الاقتراحات بالأسفل 👇",
  time: Date.now(),
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** minimal markdown renderer: **bold**, line breaks */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-bold text-teal-200">{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

export function AssistantFab({ onClick, hidden }: { onClick: () => void; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <motion.button
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed z-[66] bottom-[152px] md:bottom-[104px] left-3 md:left-6 group"
      aria-label="افتح مساعد مسلم"
    >
      <span className="absolute inset-0 rounded-full bg-teal-400/30 blur-xl animate-pulse pointer-events-none" />
      <span className="relative flex items-center gap-2 pe-3.5 ps-2 h-12 rounded-full bg-gradient-to-l from-teal-300 via-teal-400 to-emerald-500 text-[#16221a] border border-teal-100/60 shadow-[0_10px_30px_rgba(79,138,96,0.45)]">
        <span className="w-8 h-8 rounded-full bg-[#16221a]/90 grid place-items-center text-teal-200 border border-teal-200/30">
          <Bot size={17} />
        </span>
        <span className="font-tajawal font-bold text-[13px] leading-none flex items-center gap-1">
          مُسلم
          <Sparkles size={12} className="opacity-70" />
        </span>
      </span>
    </motion.button>
  );
}

export default function Assistant({
  open, onClose, ctx, onAction, aiConfig, setAiConfig, online, messages, setMessages, onNewReminder,
}: Props) {
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [listening, setListening] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const list = messages.length ? messages : [WELCOME];

  const chips = useMemo(() => {
    const fromLast = [...list].reverse().find((m) => m.role === "assistant" && m.actions)?.text ? [] : [];
    void fromLast;
    return [
      "ابحث عن آيات الصبر",
      "فسّر آية ٥ من البقرة",
      "خطة وِرد يومية",
      "شغّل سورة الكهف",
      "مواقيت الصلاة",
      "ذكرني بعد ٢٠ دقيقة أشرب ماء",
      "نبّهني كل يوم ٦ صباحاً بأذكار الصباح",
      "فضل الأيام البيض",
      "صلّ على النبي",
      "دعاء للرزق",
    ];
  }, [list]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        inputRef.current?.focus();
      }, 120);
    }
  }, [open, list.length, typing]);

  useEffect(() => {
    if (!messages.length) setMessages([WELCOME]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || typing) return;
    setInput("");
    setErr(null);
    const userMsg: ChatMessage = { id: uid(), role: "user", text, time: Date.now() };
    const history = [...list.filter((m) => m.id !== "welcome"), userMsg];
    setMessages([...list, userMsg]);
    setTyping(true);
    try {
      const historyTurns = history
        .filter((m) => m.id !== userMsg.id && m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.text }));
      const reply = await askMuslimSmart(text, ctx, historyTurns, { aiConfig, online });
      let replyText = reply.text;
      const actions: AssistantAction[] = reply.actions;

      // execute reminder actions (may be more than one, e.g. a wird plan)
      const reminders = actions.filter((a) => a.kind === "reminder");
      for (const ra of reminders) {
        if (ra.kind !== "reminder") continue;
        const ok = onNewReminder?.(ra.title, ra.body, ra.dueAt, ra.repeat);
        if (!ok) replyText += "\n\n⚠️ فعّل الإشعارات من زر الجرس 🔔 عشان التذكير يوصلك على جهازك.";
      }
      const rest = actions.filter((a) => a.kind !== "reminder");
      rest.forEach((a) => onAction(a));

      const aiMsg: ChatMessage = {
        id: uid(), role: "assistant", text: replyText, actions, time: Date.now(),
      };
      setMessages([...list, userMsg, aiMsg]);
    } finally {
      setTyping(false);
    }
  };

  const startVoice = () => {
    type SR = new () => {
      lang: string; interimResults: boolean; continuous: boolean;
      onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void;
      onend: () => void; onerror: () => void; start: () => void;
    };
    const w = window as unknown as { webkitSpeechRecognition?: SR; SpeechRecognition?: SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setErr("الميكروفون غير متاح في هذا المتصفح — اكتب طلبك وسأنفّذه.");
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = "ar-EG";
      rec.interimResults = false;
      rec.continuous = false;
      rec.onresult = (e) => {
        const said = e.results[0][0].transcript;
        setInput(said);
        setTimeout(() => send(said), 250);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const clearChat = () => {
    setMessages([WELCOME]);
    setErr(null);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm md:bg-black/40"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={cn(
                "fixed z-[95] glass-strong overflow-hidden flex flex-col shadow-2xl border-teal-300/25",
                "inset-0 md:inset-auto md:bottom-5 md:left-6 md:rounded-3xl md:border",
                expanded ? "md:w-[620px] md:h-[86vh]" : "md:w-[404px] md:h-[640px] md:max-h-[84vh]"
              )}
              dir="rtl"
            >
              {/* header */}
              <div className="relative shrink-0 border-b border-teal-300/15 bg-gradient-to-l from-teal-500/[0.12] to-[#08202a] px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative w-10 h-10 rounded-2xl grid place-items-center bg-gradient-to-br from-teal-300 to-emerald-600 text-[#16221a] shadow-[0_0_18px_rgba(143,191,154,0.45)]">
                    <Bot size={21} />
                    <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#08202a]" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-amiri font-bold text-[17px] text-[#f6efdf] leading-none flex items-center gap-1.5">
                      مُسلم
                      <span className="text-[9.5px] font-tajawal font-bold px-1.5 py-0.5 rounded-full bg-teal-400/15 border border-teal-300/30 text-teal-200">ذكاء اصطناعي</span>
                    </p>
                    <p className="text-[10.5px] text-teal-100/55 font-tajawal mt-1">
                      {aiConfig.enabled && aiConfig.key ? "متصل بالذكاء السحابي • " : "يعمل محلياً بدون نت • "}
                      مساعدك في ورد
                    </p>
                  </div>
                  <button onClick={clearChat} title="محادثة جديدة" className="w-8 h-8 grid place-items-center rounded-lg text-teal-100/60 hover:bg-white/5 hover:text-teal-100 active:scale-90 transition-all">
                    <Trash2 size={15} />
                  </button>
                  <button onClick={() => setShowSettings((v) => !v)} title="إعدادات الذكاء" className={cn("w-8 h-8 grid place-items-center rounded-lg hover:bg-white/5 active:scale-90 transition-all", showSettings ? "text-teal-200 bg-teal-400/10" : "text-teal-100/60")}>
                    <Settings2 size={15} />
                  </button>
                  <button onClick={() => setExpanded((v) => !v)} className="hidden md:grid w-8 h-8 place-items-center rounded-lg text-teal-100/60 hover:bg-white/5 active:scale-90 transition-all" title="تكبير">
                    {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  </button>
                  <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-teal-100/70 hover:bg-rose-400/10 hover:text-rose-200 active:scale-90 transition-all" aria-label="إغلاق">
                    <X size={17} />
                  </button>
                </div>
              </div>

              {showSettings ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="rounded-2xl border border-teal-300/20 bg-black/25 p-3.5">
                    <p className="font-amiri font-bold text-[15px] text-teal-50 flex items-center gap-1.5"><ShieldCheck size={15} className="text-emerald-300" /> العقل المحلي (يعمل دائماً)</p>
                    <p className="text-[12px] text-teal-100/60 font-tajawal mt-1.5 leading-relaxed">
                      مسلم يفهم أوامرك العربية وينفّذها فعلياً داخل ورد: تشغيل السور، فتح التفسير، المفضلة، التحميل بدون نت، المواقيت، الأذكار، والصلاة على النبي، وضبط التذكيرات — كل ذلك بدون إنترنت.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-200/25 bg-amber-300/[0.05] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-amiri font-bold text-[15px] text-amber-50 flex items-center gap-1.5"><KeyRound size={15} className="text-amber-300" /> ذكاء سحابي موسّع (اختياري)</p>
                      <button
                        onClick={() => setAiConfig({ ...aiConfig, enabled: !aiConfig.enabled })}
                        className={cn("w-10 h-5 rounded-full transition-colors relative shrink-0", aiConfig.enabled ? "bg-emerald-400/70" : "bg-white/15")}
                        aria-label="تشغيل الذكاء السحابي"
                      >
                        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ right: aiConfig.enabled ? 2 : 22 }} />
                      </button>
                    </div>
                    <p className="text-[11.5px] text-amber-100/70 font-tajawal leading-relaxed">
                      أضف مفتاح API متوافق مع OpenAI ليجيب «مسلم» عن أي سؤال عام بتفصيل أكبر. المفتاح يُخزَّن على جهازك فقط ولا يُرسل لأي طرف غير مزوّد الذكاء الذي تختاره.
                    </p>
                    <input
                      value={aiConfig.key}
                      onChange={(e) => setAiConfig({ ...aiConfig, key: e.target.value })}
                      placeholder="sk-..."
                      type="password"
                      dir="ltr"
                      className="w-full h-10 rounded-xl bg-black/40 border border-white/10 focus:border-amber-300/50 outline-none px-3 text-[12.5px] text-teal-50 font-mono"
                    />
                    <div className="flex gap-2">
                      <input
                        value={aiConfig.model}
                        onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                        placeholder="gpt-4o-mini"
                        dir="ltr"
                        className="flex-1 h-9 rounded-xl bg-black/40 border border-white/10 focus:border-amber-300/50 outline-none px-3 text-[11.5px] text-teal-50 font-mono"
                      />
                      <input
                        value={aiConfig.baseUrl}
                        onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                        placeholder="https://api.openai.com/v1"
                        dir="ltr"
                        className="flex-1 h-9 rounded-xl bg-black/40 border border-white/10 focus:border-amber-300/50 outline-none px-3 text-[11.5px] text-teal-50 font-mono"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAiConfig({ ...DEFAULT_AI_CONFIG })}
                        className="h-9 px-3 rounded-lg border border-white/10 text-[11.5px] font-bold text-teal-100/70 hover:bg-white/5"
                      >
                        تصفير
                      </button>
                      <button
                        onClick={() => setShowSettings(false)}
                        className="flex-1 h-9 rounded-lg bg-gradient-to-l from-teal-300 to-teal-500 text-[#16221a] text-[12px] font-bold active:scale-[0.98] transition-all"
                      >
                        تم — العودة للمحادثة
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-teal-100/40 font-tajawal leading-relaxed">
                    «مسلم» قد يخطئ في الفتاوى أو المعلومات — للأسئلة الشرعية الدقيقة راجع أهل العلم. التفسير المعروض هو التفسير الميسر المعتمد.
                  </p>
                </div>
              ) : (
                <>
                  {/* messages */}
                  <div ref={scrollRef} className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3">
                    {list.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex gap-2", m.role === "user" ? "flex-row-reverse" : "")}
                      >
                        {m.role === "assistant" ? (
                          <span className="shrink-0 w-7 h-7 rounded-xl grid place-items-center bg-teal-400/15 border border-teal-300/30 text-teal-200 mt-0.5">
                            <Bot size={14} />
                          </span>
                        ) : (
                          <span className="shrink-0 w-7 h-7 rounded-xl grid place-items-center bg-white/[0.06] border border-white/10 text-teal-100/70 mt-0.5 text-[11px] font-bold">أنت</span>
                        )}
                        <div className={cn(
                          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-[1.95] font-tajawal whitespace-pre-wrap break-words",
                          m.role === "user"
                            ? "bg-gradient-to-l from-teal-400/25 to-teal-600/20 border border-teal-300/35 text-teal-50 rounded-tr-sm"
                            : "bg-black/30 border border-teal-300/15 text-teal-50/90 rounded-tl-sm"
                        )}>
                          <Rich text={m.text} />
                          {m.role === "assistant" && m.actions && m.actions.some((a) => a.kind === "reminder") && (
                            <span className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-300 bg-emerald-400/10 border border-emerald-300/30 rounded-full px-2 py-0.5">
                              <Sparkles size={10} /> تم ضبط التذكير
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {typing && (
                      <div className="flex gap-2">
                        <span className="shrink-0 w-7 h-7 rounded-xl grid place-items-center bg-teal-400/15 border border-teal-300/30 text-teal-200">
                          <Bot size={14} />
                        </span>
                        <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-black/30 border border-teal-300/15 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-bounce" style={{ animationDelay: "120ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-bounce" style={{ animationDelay: "240ms" }} />
                        </div>
                      </div>
                    )}
                    {err && (
                      <p className="text-[11.5px] text-amber-200 bg-amber-300/10 border border-amber-200/30 rounded-xl px-3 py-2 font-tajawal">{err}</p>
                    )}
                  </div>

                  {/* chips */}
                  <div className="shrink-0 px-3 pb-2">
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {chips.map((c) => (
                        <button
                          key={c}
                          onClick={() => send(c)}
                          className="shrink-0 h-8 px-3 rounded-full border border-teal-300/25 bg-white/[0.03] text-[11.5px] font-bold text-teal-100/80 hover:bg-teal-400/10 hover:border-teal-300/50 active:scale-95 transition-all flex items-center gap-1"
                        >
                          <Wand2 size={11} className="opacity-60" /> {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* input */}
                  <div className="shrink-0 border-t border-teal-300/15 p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={startVoice}
                        className={cn(
                          "shrink-0 w-10 h-10 grid place-items-center rounded-xl border active:scale-90 transition-all",
                          listening ? "bg-rose-400/20 border-rose-300/50 text-rose-200 animate-pulse" : "border-teal-300/20 text-teal-200/70 hover:bg-teal-400/10"
                        )}
                        title="تحدث مع مسلم"
                      >
                        <Mic size={17} />
                      </button>
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                        placeholder={listening ? "أتحدث الآن…" : "اكتب طلبك لمسلم…"}
                        className="flex-1 h-10 rounded-xl bg-black/35 border border-teal-300/20 focus:border-teal-300/55 outline-none px-3.5 text-[13px] text-teal-50 placeholder:text-teal-100/30"
                      />
                      <button
                        onClick={() => send()}
                        disabled={!input.trim() || typing}
                        className="shrink-0 w-10 h-10 grid place-items-center rounded-xl bg-gradient-to-br from-teal-300 to-emerald-500 text-[#16221a] disabled:opacity-40 active:scale-90 transition-all shadow-[0_0_16px_rgba(143,191,154,0.35)]"
                        aria-label="إرسال"
                      >
                        {typing ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} className="-scale-x-100" />}
                      </button>
                    </div>
                    <p className="text-center text-[9.5px] text-teal-100/35 font-tajawal mt-1.5">
                      مُسلم مساعد ذكي داخل وِرْد — التذكيرات تُحفظ على جهازك
                    </p>
                  </div>
                </>
              )}

              {showSettings && (
                <button onClick={() => setShowSettings(false)} className="hidden" aria-hidden="true"><ChevronLeft size={1} /></button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
