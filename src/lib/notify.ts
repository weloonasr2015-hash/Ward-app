/* ============================================================
   وِرْد — notification & reminder engine
   - Local notifications (Service Worker when available)
   - Prayer / Adhkar / Salawat / custom reminders
   - Repeating "gentle" reminders so the user is always nudged
   ============================================================ */

export type ReminderType = "prayer" | "adhkar" | "salawat" | "custom" | "gentle";
export type Repeat = "once" | "daily" | "weekly";

export interface Reminder {
  id: string;
  title: string;
  body: string;
  dueAt: number;
  repeat: Repeat;
  type: ReminderType;
  enabled: boolean;
  createdAt: number;
  lastFired?: number;
  auto?: boolean;
}

export interface NotifSettings {
  enabled: boolean;
  prayer: boolean;
  adhkar: boolean;
  salawat: boolean;
  salawatEveryMin: number;
  gentle: boolean;
  gentleEveryMin: number;
  adhkarMorning: string;
  adhkarEvening: string;
}

export const DEFAULT_NOTIF_SETTINGS: NotifSettings = {
  enabled: false,
  prayer: true,
  adhkar: true,
  salawat: true,
  salawatEveryMin: 120,
  gentle: true,
  gentleEveryMin: 180,
  adhkarMorning: "05:45",
  adhkarEvening: "18:15",
};

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  try {
    const p = await Notification.requestPermission();
    return p === "granted";
  } catch {
    return false;
  }
}

async function getSwReg(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (!("serviceWorker" in navigator)) return null;
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) {
      await existing.update().catch(() => {});
      return existing;
    }
    const reg = await navigator.serviceWorker.register("./sw.js");
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

export interface NotifPayload {
  title: string;
  body: string;
  tag?: string;
  tab?: string;
  icon?: string;
}

/** Show a notification: Service Worker first (works when app is backgrounded), then constructor */
export async function showNotification(p: NotifPayload): Promise<boolean> {
  if (permissionState() !== "granted") return false;
  const reg = await getSwReg();
  const icon = p.icon || "./icons/icon-192.png";
  const options: NotificationOptions = {
    body: p.body,
    icon,
    badge: icon,
    tag: p.tag || `ward-${Date.now()}`,
    dir: "rtl",
    lang: "ar",
    data: { tab: p.tab || "surahs", url: "./" },
  };
  try {
    if (reg) {
      await reg.showNotification(p.title, { ...options, icon, badge: icon } as NotificationOptions);
      return true;
    }
  } catch { /* fall through */ }
  try {
    new Notification(p.title, options);
    return true;
  } catch {
    return false;
  }
}

export function formatWhen(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now.getTime() + 86400000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `اليوم ${time}`;
  if (tomorrow) return `غداً ${time}`;
  return `${d.toLocaleDateString("ar-EG", { day: "numeric", month: "long" })} ${time}`;
}

export function nextOccurrenceOfClock(clock: string, from: number = Date.now(), repeat: Repeat = "daily"): number {
  const [h, m] = (clock || "06:00").split(":").map((x) => parseInt(x, 10) || 0);
  const base = new Date(from);
  const target = new Date(base);
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= from) {
    if (repeat === "daily") target.setDate(target.getDate() + 1);
    else if (repeat === "weekly") target.setDate(target.getDate() + 7);
  }
  return target.getTime();
}

/* ---------- recurring reminders ---------- */
let seq = 0;
export function makeId(prefix = "r"): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

export function makeReminder(input: {
  title: string;
  body: string;
  dueAt: number;
  repeat?: Repeat;
  type?: ReminderType;
  auto?: boolean;
}): Reminder {
  return {
    id: makeId(input.auto ? "auto" : "rm"),
    title: input.title,
    body: input.body,
    dueAt: input.dueAt,
    repeat: input.repeat || "once",
    type: input.type || "custom",
    enabled: true,
    createdAt: Date.now(),
    auto: !!input.auto,
  };
}

/** Background checker: returns fired reminders and the rescheduled list */
export function processDue(
  list: Reminder[],
  now: number = Date.now()
): { fired: Reminder[]; next: Reminder[] } {
  const fired: Reminder[] = [];
  const next: Reminder[] = [];
  for (const r of list) {
    if (!r.enabled) {
      next.push(r);
      continue;
    }
    if (r.dueAt <= now && now - r.dueAt < 1000 * 60 * 60 * 12) {
      const already = r.lastFired && now - r.lastFired < 60000;
      if (!already) fired.push({ ...r, lastFired: now });
      if (r.repeat === "once") continue; // consumed
      const step = r.repeat === "daily" ? 86400000 : 7 * 86400000;
      let due = r.dueAt + step;
      while (due <= now) due += step;
      next.push({ ...r, dueAt: due, lastFired: now });
    } else if (r.dueAt <= now) {
      // long overdue (app was closed) — keep as caught-up readable, reschedule repeats
      if (r.repeat !== "once") {
        const step = r.repeat === "daily" ? 86400000 : 7 * 86400000;
        let due = r.dueAt + step;
        while (due <= now) due += step;
        next.push({ ...r, dueAt: due });
      }
    } else {
      next.push(r);
    }
  }
  return { fired, next: next.sort((a, b) => a.dueAt - b.dueAt) };
}

/* ---------- content library ---------- */
export const SALAWAT_TEXT = "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ ﷺ";
export const GENTLE_NUDGES: { title: string; body: string; tab: string }[] = [
  { title: "تذكير لطيف 🤍", body: "﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾ — خُذ دقيقة للذكر الآن.", tab: "adhkar" },
  { title: "صلاة على النبي ﷺ", body: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ — صلِّ عليه الآن.", tab: "adhkar" },
  { title: "وِردك اليومي 📖", body: "لم تقرأ وِردك بعد؟ افتح المصحف واقرأ صفحة مع التفسير الميسر.", tab: "mushaf" },
  { title: "اقترب وقت الصلاة 🕌", body: "راجع مواقيت الصلاة والعدّ التنازلي للصلاة القادمة.", tab: "prayer" },
  { title: "من فضل الصيام 🌙", body: "الإثنين والخميس يومان تُعرض فيهما الأعمال — هل تنوي الصيام؟", tab: "prayer" },
  { title: "استغفار 🤍", body: "أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه.", tab: "adhkar" },
  { title: "خصّص لحظة للمصحف 📖", body: "اضغط على أي آية لعرض تفسيرها الميسر بضغطة واحدة.", tab: "mushaf" },
  { title: "تذكير بالدعاء 🤲", body: "اللهم إني أسألك علماً نافعاً ورزقاً طيباً وعملاً متقبلاً.", tab: "adhkar" },
];

export function salawatReminderContent(count: number): { title: string; body: string } {
  return {
    title: "صلِّ على النبي ﷺ",
    body: `${SALAWAT_TEXT}\nصلِّ عليه الآن — وصلّيت ${count} مرة حتى الآن.`,
  };
}

/** Build auto reminders from settings + today's prayer times (offline-safe) */
export function buildAutoReminders(
  settings: NotifSettings,
  timings: Record<string, string> | null,
  now: number = Date.now()
): Reminder[] {
  const out: Reminder[] = [];
  if (!settings.enabled) return out;
  const todayKey = new Date(now).toDateString();

  if (settings.prayer && timings) {
    const names: [string, string][] = [
      ["Fajr", "الفجر"], ["Dhuhr", "الظهر"], ["Asr", "العصر"], ["Maghrib", "المغرب"], ["Isha", "العشاء"],
    ];
    for (const [key, ar] of names) {
      const t = timings[key];
      if (!t) continue;
      let due = nextOccurrenceOfClock(t, now, "daily");
      if (due - now < 120000) due += 86400000; // avoid double-firing right at the moment
      out.push(
        makeReminder({
          title: `حان وقت صلاة ${ar} 🕌`,
          body: `حيّ على الصلاة، حيّ على الفلاح — تقبّل الله منك. (${t})`,
          dueAt: due,
          repeat: "daily",
          type: "prayer",
          auto: true,
        })
      );
      void key;
    }
  }

  if (settings.adhkar) {
    const m = nextOccurrenceOfClock(settings.adhkarMorning, now, "daily");
    const e = nextOccurrenceOfClock(settings.adhkarEvening, now, "daily");
    if (m - now > 120000)
      out.push(makeReminder({
        title: "أذكار الصباح ☀️",
        body: "ابدأ يومك بذكر الله — أذكار الصباح بانتظارك في ورد.",
        dueAt: m, repeat: "daily", type: "adhkar", auto: true,
      }));
    if (e - now > 120000)
      out.push(makeReminder({
        title: "أذكار المساء 🌙",
        body: "حين المساء حان وقت أذكار المساء — واحفظ نفسك في حفظ الله.",
        dueAt: e, repeat: "daily", type: "adhkar", auto: true,
      }));
  }

  if (settings.salawat) {
    out.push(makeReminder({
      title: "صلاة على النبي ﷺ",
      body: SALAWAT_TEXT,
      dueAt: now + settings.salawatEveryMin * 60000,
      repeat: "once",
      type: "salawat",
      auto: true,
    }));
  }

  if (settings.gentle) {
    out.push(makeReminder({
      title: "تذكير من ورد 🤍",
      body: "لا تنسَ وِردك اليومي — دقيقة واحدة تكفي.",
      dueAt: now + settings.gentleEveryMin * 60000,
      repeat: "once",
      type: "gentle",
      auto: true,
    }));
  }
  void todayKey;
  return out;
}

/** keep auto reminders fresh without duplicating user-created ones */
export function mergeAutoReminders(current: Reminder[], fresh: Reminder[]): Reminder[] {
  const manual = current.filter((r) => !r.auto);
  return [...manual, ...fresh].sort((a, b) => a.dueAt - b.dueAt);
}

export function upcoming(list: Reminder[], limit = 6): Reminder[] {
  const now = Date.now();
  return list.filter((r) => r.enabled && r.dueAt >= now - 60000).sort((a, b) => a.dueAt - b.dueAt).slice(0, limit);
}

/* ============================================================
   Native (Android/iOS) scheduling — works even when app is closed
   Uses @capacitor/local-notifications when running in the shell.
   ============================================================ */
async function isNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function hashId(key: string, offset = 0): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 2000000000) + 1000 + offset;
}

/** Schedule all upcoming reminders on the device (repeats expanded 14 days). */
export async function syncNativeNotifications(list: Reminder[], settings?: NotifSettings): Promise<void> {
  if (!(await isNative())) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const check = await LocalNotifications.checkPermissions();
    if (check.display !== "granted") {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== "granted") return;
    }
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
    const now = Date.now();
    const horizon = now + 14 * 86400000;
    const notifications: {
      id: number; title: string; body: string;
      schedule: { at: Date; allowWhileIdle: boolean };
      extra: { tab: string };
    }[] = [];
    for (const r of list) {
      if (!r.enabled) continue;
      const targets: number[] = [];
      const chainMin = r.type === "salawat" ? settings?.salawatEveryMin : r.type === "gentle" ? settings?.gentleEveryMin : null;
      if (r.repeat === "once" && chainMin) {
        // chained reminders: schedule the whole cadence ahead for native devices
        let t = r.dueAt;
        while (t <= now) t += chainMin * 60000;
        for (let i = 0; i < 20 && t < horizon && targets.length < 20; i++, t += chainMin * 60000) targets.push(t);
      } else if (r.repeat === "once") {
        if (r.dueAt > now && r.dueAt < horizon) targets.push(r.dueAt);
      } else {
        const step = r.repeat === "daily" ? 86400000 : 7 * 86400000;
        let t = r.dueAt;
        while (t <= now) t += step;
        for (let i = 0; i < 14 && t < horizon; i++, t += step) targets.push(t);
      }
      targets.slice(0, 14).forEach((t, i) => {
        if (notifications.length >= 60) return;
        notifications.push({
          id: hashId(r.id, i),
          title: r.title,
          body: r.body,
          schedule: { at: new Date(t), allowWhileIdle: true },
          extra: { tab: r.type === "prayer" ? "prayer" : r.type === "adhkar" || r.type === "salawat" ? "adhkar" : "mushaf" },
        });
      });
      if (notifications.length >= 60) break;
    }
    if (notifications.length) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch { /* web or plugin unavailable */ }
}

/** Turn automatic reminders off at the native layer too */
export async function cancelAllNative(): Promise<void> {
  if (!(await isNative())) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
  } catch { /* ignore */ }
}
