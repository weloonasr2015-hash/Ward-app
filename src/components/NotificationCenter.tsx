import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell, BellRing, X, Check, Loader2, MoonStar, Sunrise, Heart,
  Sparkles, Trash2, Clock3, Repeat, Plus, BellOff, CalendarClock, Send,
} from "lucide-react";
import type { Reminder, NotifSettings } from "../lib/notify";
import { formatWhen, permissionState, requestNotificationPermission, showNotification, upcoming, SALAWAT_TEXT } from "../lib/notify";
import { cn } from "../utils/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  settings: NotifSettings;
  setSettings: (s: NotifSettings) => void;
  reminders: Reminder[];
  onDeleteReminder: (id: string) => void;
  onClearAuto: () => void;
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      role="switch"
      aria-checked={on}
      className={cn(
        "relative w-11 h-6 rounded-full shrink-0 transition-colors",
        on ? "bg-gradient-to-l from-teal-300 to-teal-500 shadow-[0_0_12px_rgba(143,191,154,0.4)]" : "bg-white/15",
        disabled && "opacity-50"
      )}
    >
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ right: on ? 2 : 24 }} />
    </button>
  );
}

export function BellButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative w-10 h-10 grid place-items-center rounded-full border border-teal-300/25 bg-white/[0.03] text-teal-100 hover:bg-teal-400/10 hover:border-teal-300/50 active:scale-90 transition-all"
      title="الإشعارات والتذكيرات"
      aria-label="الإشعارات والتذكيرات"
    >
      <Bell size={17} />
      {count > 0 && (
        <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-[#231600] text-[10px] font-bold grid place-items-center border border-[#0b1410]">
          {count > 9 ? "٩+" : count}
        </span>
      )}
    </button>
  );
}

export default function NotificationCenter({
  open, onClose, settings, setSettings, reminders, onDeleteReminder, onClearAuto,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [perm, setPerm] = useState(permissionState());
  const [tested, setTested] = useState<string | null>(null);

  useEffect(() => {
    if (open) setPerm(permissionState());
  }, [open]);

  const enable = async () => {
    setBusy(true);
    const ok = await requestNotificationPermission();
    setPerm(permissionState());
    setSettings({ ...settings, enabled: ok });
    setBusy(false);
    if (ok) {
      await showNotification({
        title: "تم تفعيل إشعارات وِرْد ✅",
        body: "هتنبّهك بمواقيت الصلاة والأذكار والصلاة على النبي، وكل تذكير تطلبه من مسلم.",
        tag: "welcome",
      });
    }
  };

  const test = async () => {
    setBusy(true);
    const ok = await showNotification({
      title: "تذكير تجريبي من وِرْد 🤍",
      body: SALAWAT_TEXT,
      tag: "test",
    });
    setTested(ok ? "تم إرسال الإشعار ✅" : "الإشعارات غير مسموحة من المتصفح — فعّلها أولاً.");
    setBusy(false);
    setTimeout(() => setTested(null), 3500);
  };

  const list = upcoming(reminders, 8);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[88] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed z-[92] inset-x-0 bottom-0 md:inset-auto md:top-24 md:left-6 md:w-[420px] glass-strong rounded-t-3xl md:rounded-3xl border border-teal-300/25 max-h-[88vh] flex flex-col overflow-hidden"
            dir="rtl"
          >
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-teal-300/15 bg-gradient-to-l from-teal-500/10 to-transparent shrink-0">
              <span className="w-9 h-9 rounded-xl grid place-items-center bg-teal-400/15 border border-teal-300/30 text-teal-200">
                <BellRing size={17} />
              </span>
              <div className="flex-1">
                <p className="font-amiri font-bold text-[16px] text-[#f6efdf] leading-none">الإشعارات والتذكيرات</p>
                <p className="text-[10.5px] text-teal-100/55 font-tajawal mt-1">مواقيت • أذكار • صلاة على النبي • أي تذكير</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-teal-100/60 hover:bg-white/5 active:scale-90 transition-all" aria-label="إغلاق">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {/* permission card */}
              <div className={cn(
                "rounded-2xl border p-3.5",
                perm === "granted" && settings.enabled
                  ? "border-emerald-300/30 bg-emerald-400/[0.07]"
                  : "border-amber-200/30 bg-amber-300/[0.06]"
              )}>
                <div className="flex items-center gap-2">
                  {perm === "granted" && settings.enabled
                    ? <span className="w-8 h-8 rounded-lg grid place-items-center bg-emerald-400/15 border border-emerald-300/30 text-emerald-200"><Check size={16} /></span>
                    : <span className="w-8 h-8 rounded-lg grid place-items-center bg-amber-300/15 border border-amber-200/30 text-amber-200"><BellOff size={16} /></span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-teal-50">
                      {perm === "granted" && settings.enabled ? "الإشعارات مفعّلة" : "فعّل الإشعارات على جهازك"}
                    </p>
                    <p className="text-[11px] text-teal-100/60 font-tajawal leading-relaxed">
                      {perm === "granted" && settings.enabled
                        ? "هتوصلك تنبيهات في وقتها حتى لو التطبيق في الخلفية."
                        : "هنسألك إذن المتصفح مرة واحدة، وبعدها تقدر تتحكم في كل نوع تذكير."}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-2.5">
                  <button
                    onClick={enable}
                    disabled={busy}
                    className="flex-1 h-9 rounded-xl bg-gradient-to-l from-teal-300 to-teal-500 text-[#16221a] text-[12px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                    {perm === "granted" ? "تأكيد التفعيل" : "السماح بالإشعارات"}
                  </button>
                  <button
                    onClick={test}
                    disabled={busy}
                    className="h-9 px-3 rounded-xl border border-teal-300/25 text-teal-100 text-[12px] font-bold flex items-center gap-1.5 hover:bg-teal-400/10 active:scale-95 transition-all"
                  >
                    <Send size={13} /> تجربة
                  </button>
                </div>
                {tested && <p className="text-[11px] text-teal-100/70 font-tajawal mt-2">{tested}</p>}
                {perm === "unsupported" && (
                  <p className="text-[11px] text-amber-200 font-tajawal mt-2 leading-relaxed">
                    المتصفح لا يدعم إشعارات النظام — التذكيرات هتظهر داخل التطبيق في وقتها، وهتشتغل كإشعارات كاملة في نسخة الأندرويد.
                  </p>
                )}
                {perm === "denied" && (
                  <p className="text-[11px] text-amber-200 font-tajawal mt-2 leading-relaxed">
                    الإشعارات مرفوضة من إعدادات المتصفح. افتح إعدادات الموقع ← الإشعارات ← السماح ثم أعد المحاولة.
                  </p>
                )}
              </div>

              {/* types */}
              <div className="rounded-2xl border border-teal-300/15 bg-black/20 divide-y divide-teal-300/10">
                {[
                  { key: "prayer" as const, Icon: MoonStar, title: "مواقيت الصلاة", desc: "تنبيه عند دخول وقت كل صلاة" },
                  { key: "adhkar" as const, Icon: Sunrise, title: "أذكار الصباح والمساء", desc: "تذكير يومي في الموعدين" },
                ].map(({ key, Icon, title, desc }) => (
                  <div key={key} className="flex items-center gap-2.5 p-3">
                    <span className="w-8 h-8 shrink-0 rounded-lg grid place-items-center bg-teal-400/10 border border-teal-300/25 text-teal-200"><Icon size={15} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-bold text-teal-50">{title}</p>
                      <p className="text-[10.5px] text-teal-100/50 font-tajawal">{desc}</p>
                    </div>
                    <Toggle on={settings[key]} onChange={(v) => setSettings({ ...settings, [key]: v })} disabled={!settings.enabled} />
                  </div>
                ))}

                {/* adhkar times */}
                {settings.adhkar && (
                  <div className="flex items-center gap-2 p-3 bg-white/[0.02]">
                    <span className="text-[11px] font-bold text-teal-100/60 flex items-center gap-1"><Clock3 size={12} /> مواعيد الأذكار:</span>
                    <label className="flex items-center gap-1 text-[11px] text-teal-100/70">
                      صباحاً
                      <input
                        type="time" value={settings.adhkarMorning}
                        onChange={(e) => setSettings({ ...settings, adhkarMorning: e.target.value })}
                        className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-[11px] text-teal-50"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-teal-100/70">
                      مساءً
                      <input
                        type="time" value={settings.adhkarEvening}
                        onChange={(e) => setSettings({ ...settings, adhkarEvening: e.target.value })}
                        className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-[11px] text-teal-50"
                      />
                    </label>
                  </div>
                )}

                <div className="p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 shrink-0 rounded-lg grid place-items-center bg-amber-300/12 border border-amber-200/30 text-amber-200"><Heart size={15} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-bold text-teal-50">الصلاة على النبي ﷺ</p>
                      <p className="text-[10.5px] text-teal-100/50 font-tajawal">تذكير متكرر على مدار اليوم</p>
                    </div>
                    <Toggle on={settings.salawat} onChange={(v) => setSettings({ ...settings, salawat: v })} disabled={!settings.enabled} />
                  </div>
                  {settings.salawat && (
                    <div className="flex items-center gap-2 mt-2.5 ps-10">
                      <Repeat size={12} className="text-teal-300/70" />
                      <span className="text-[11px] text-teal-100/60 font-bold">كل</span>
                      <select
                        value={settings.salawatEveryMin}
                        onChange={(e) => setSettings({ ...settings, salawatEveryMin: Number(e.target.value) })}
                        className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-[11.5px] text-teal-50"
                      >
                        {[30, 60, 120, 180, 240].map((m) => (
                          <option key={m} value={m}>{m === 60 ? "ساعة" : m < 60 ? `${m} دقيقة` : `${m / 60} ساعات`}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 shrink-0 rounded-lg grid place-items-center bg-teal-400/10 border border-teal-300/25 text-teal-200"><Sparkles size={15} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-bold text-teal-50">تذكيرات لطيفة متتابعة</p>
                      <p className="text-[10.5px] text-teal-100/50 font-tajawal">آية، ذكر، وفضل صيام — خلال اليوم</p>
                    </div>
                    <Toggle on={settings.gentle} onChange={(v) => setSettings({ ...settings, gentle: v })} disabled={!settings.enabled} />
                  </div>
                  {settings.gentle && (
                    <div className="flex items-center gap-2 mt-2.5 ps-10">
                      <CalendarClock size={12} className="text-teal-300/70" />
                      <span className="text-[11px] text-teal-100/60 font-bold">كل</span>
                      <select
                        value={settings.gentleEveryMin}
                        onChange={(e) => setSettings({ ...settings, gentleEveryMin: Number(e.target.value) })}
                        className="h-8 rounded-lg bg-black/40 border border-white/10 px-2 text-[11.5px] text-teal-50"
                      >
                        {[60, 120, 180, 240, 360].map((m) => (
                          <option key={m} value={m}>{m < 60 ? `${m} دقيقة` : `${m / 60} ساعة`}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* upcoming */}
              <div className="rounded-2xl border border-teal-300/15 bg-black/20 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-teal-300/10">
                  <Clock3 size={14} className="text-teal-300" />
                  <p className="text-[12.5px] font-bold text-teal-50 flex-1">التذكيرات القادمة ({list.length})</p>
                  <button onClick={onClearAuto} className="text-[10.5px] font-bold text-teal-100/50 hover:text-rose-200 transition-colors">مسح التلقائي</button>
                </div>
                <div className="max-h-[220px] overflow-y-auto">
                  {list.length === 0 ? (
                    <div className="p-4 text-center">
                      <Bell size={26} className="mx-auto text-teal-300/30 mb-2" />
                      <p className="text-[12px] text-teal-100/55 font-tajawal">لا توجد تذكيرات بعد — فعّل نوعاً بالأعلى أو اطلب من مُسلم: «ذكرني بعد ٢٠ دقيقة أشرب ماء».</p>
                    </div>
                  ) : (
                    list.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 p-2.5 border-b border-teal-300/[0.07] last:border-0">
                        <span className={cn(
                          "w-7 h-7 shrink-0 rounded-lg grid place-items-center border text-[11px]",
                          r.type === "prayer" ? "bg-teal-400/10 border-teal-300/25 text-teal-200"
                            : r.type === "salawat" ? "bg-amber-300/10 border-amber-200/30 text-amber-200"
                              : "bg-white/[0.04] border-white/10 text-teal-100/70"
                        )}>
                          {r.type === "prayer" ? <MoonStar size={13} /> : r.type === "salawat" ? <Heart size={13} /> : <Plus size={13} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11.5px] font-bold text-teal-50 truncate">{r.title}</p>
                          <p className="text-[10px] text-teal-100/50 font-tajawal truncate">{formatWhen(r.dueAt)}{r.repeat !== "once" ? " • متكرر" : ""}</p>
                        </div>
                        <button
                          onClick={() => onDeleteReminder(r.id)}
                          className="w-7 h-7 grid place-items-center rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-400/10 active:scale-90 transition-all"
                          aria-label="حذف التذكير"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <p className="text-[10.5px] text-teal-100/35 font-tajawal text-center leading-relaxed px-2">
                تذكيرات وِرْد تعمل محلياً على جهازك. الإشعارات تُعرض ما دام التطبيق مثبّتاً أو الصفحة مفتوحة في الخلفية، وتُستأنف تلقائياً عند فتح التطبيق.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
