import type { PrayerData, Reciter, SurahMeta } from "./api";
import { normAr } from "./api";

/* ============================================================
   مُسلم — الرفيق الذكي داخل ورد
   Local Arabic NLU + real in-app actions + optional cloud LLM
   ============================================================ */

export interface AssistantContext {
  surahs: SurahMeta[];
  reciters: Reciter[];
  prayer: PrayerData | null;
  selectedReciterName: string | null;
  favSurahs: number[];
  salawatCount: number;
  adhkarDone: number;
  adhkarTotal: number;
  savedCount: number;
  cityLabel: string;
  fasting: { title: string; when: string; daysLeft: number | null; virtue: string }[];
}

export type AssistantAction =
  | { kind: "tab"; tab: "surahs" | "reciters" | "mushaf" | "adhkar" | "prayer" | "favs" }
  | { kind: "play"; surah: number; reciterId?: number }
  | { kind: "read"; surah: number; tafsir?: boolean }
  | { kind: "favorite"; surah: number }
  | { kind: "reminder"; title: string; body: string; dueAt: number; repeat: "once" | "daily" | "weekly" }
  | { kind: "notifications"; enabled: boolean }
  | { kind: "search"; query: string }
  | { kind: "download"; surah: number }
  | { kind: "salawat" };

export interface AssistantReply {
  text: string;
  actions: AssistantAction[];
  chips: string[];
  intent: string;
}

/* ---------- text utilities ---------- */
export function toLatinDigits(s: string): string {
  return (s || "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

const AR = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

const SURAH_ALIASES: Record<string, number> = {
  "الفاتحه": 1, "فاتحه": 1, "البقره": 2, "بقره": 2, "الكهف": 18, "كهف": 18,
  "يس": 36, "ي س": 36, "ياسين": 36, "يسين": 36, "الرحمن": 55, "رحمن": 55, "الملك": 67, "ملك": 67,
  "الواقعه": 56, "المزمل": 73, "المدثر": 74, "الاخلاص": 112, "اخلاص": 112,
  "الفلق": 113, "الناس": 114, "الطور": 52, "الحشر": 59, "الحديد": 57,
  "المؤمنون": 23, "مريم": 19, "طه": 20, "ص": 38, "ق": 50,
  "القصص": 28, "النمل": 27, "الشعراء": 26, "القلم": 68, "الحاقه": 69,
  "الانسان": 76, "القيامه": 75, "البلد": 90, "الضحى": 93, "الشرح": 94,
  "العصر": 103, "الكوثر": 108, "الكافرون": 109, "النصر": 110, "المسد": 111,
  "الجمعه": 62, "الفتح": 48, "الحجرات": 49, "الصف": 61, "التغابن": 64,
  "الطلاق": 65, "التحريم": 66, "المعارج": 70, "الجن": 72, "المرسلات": 77,
  "النبأ": 78, "عبس": 80, "التكوير": 81, "الانفطار": 82, "المطففين": 83,
  "الانشقاق": 84, "البروج": 85, "الطارق": 86, "الاعلى": 87, "الغاشيه": 88,
  "الفجر": 89, "الشمس": 91, "الليل": 92, "التين": 95, "العلق": 96,
  "القدر": 97, "البينه": 98, "الزلزله": 99, "العاديات": 100, "القارعه": 101,
  "التكاثر": 102, "الهمزه": 104, "الفيل": 105, "قريش": 106, "الماعون": 107,
  "الانفال": 8, "التوبه": 9, "يونس": 10, "هود": 11, "يوسف": 12, "الرعد": 13,
  "ابراهيم": 14, "الحجر": 15, "النحل": 16, "الاسراء": 17, "الانبياء": 21,
  "الحج": 22, "النور": 24, "الفرقان": 25, "العنكبوت": 29, "الروم": 30,
  "لقمان": 31, "السجده": 32, "الاحزاب": 33, "سبأ": 34, "فاطر": 35,
  "الصافات": 37, "الزمر": 39, "غافر": 40, "فصلت": 41, "الشورى": 42,
  "الزخرف": 43, "الدخان": 44, "الجاثيه": 45, "الاحقاف": 46, "الذاريات": 51,
  "النجم": 53, "القمر": 54, "المجادله": 58, "الممتحنه": 60, "المنافقون": 63,
};

function findSurah(qRaw: string, surahs: SurahMeta[]): SurahMeta | null {
  const q = toLatinDigits(qRaw).trim();
  if (!q) return null;
  const numMatch = q.match(/(?:سوره|سورة)?\s*(\d{1,3})/);
  const norm = normAr(q.replace(/سوره|سورة|القران|قران/g, " "));

  // explicit alias
  for (const [k, n] of Object.entries(SURAH_ALIASES)) {
    if (norm === normAr(k) || new RegExp(`(^|\\s)${normAr(k)}(\\s|$)`).test(norm)) {
      const s = surahs.find((x) => x.number === n);
      if (s) return s;
    }
  }
  // exact normalized name
  const exact = surahs.find((s) => normAr(s.name) === norm);
  if (exact) return exact;
  // contains match (avoid very short tokens)
  const contains = surahs.find((s) => norm.length >= 3 && (norm.includes(normAr(s.name)) || normAr(s.name).includes(norm)));
  if (contains) return contains;
  // canonical aliases like "ال عمران"
  const compact = norm.replace(/\s/g, "");
  const alias = surahs.find((s) => normAr(s.name).replace(/\s/g, "") === compact);
  if (alias) return alias;
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n >= 1 && n <= 114) return surahs.find((s) => s.number === n) || null;
  }
  return null;
}

const RECITER_STOP = new Set([
  "بصوت", "صوت", "القارئ", "القاري", "الشيخ", "شغل", "شغلي", "سمعني", "سوره", "سورة",
  "افتح", "ابحث", "دور", "علي", "على", "ابغي", "عايز", "اسمه", "قراء", "قران", "القران",
  "من", "في", "مع", "عن", "الي", "كمان", "كده", "ليه", "ايه", "اية", "تلاوة", "بصوته",
]);

function findReciter(qRaw: string, reciters: Reciter[]): Reciter | null {
  const norm = normAr(toLatinDigits(qRaw));
  if (norm.length < 3) return null;
  const direct =
    reciters.find((r) => normAr(r.name) === norm) ||
    reciters.find((r) => normAr(r.name).includes(norm)) ||
    reciters.find((r) => norm.includes(normAr(r.name)) && normAr(r.name).length >= 6);
  if (direct) return direct;

  const tokens = norm.split(/\s+/).filter((w) => w.length >= 4 && !RECITER_STOP.has(w));
  let best: { rec: Reciter; score: number } | null = null;
  for (const r of reciters) {
    const name = normAr(r.name);
    for (const tok of tokens) {
      if (name.includes(tok)) {
        const score = tok.length + (name.endsWith(tok) ? 2 : 0);
        if (!best || score > best.score) best = { rec: r, score };
      }
    }
  }
  return best ? best.rec : null;
}

function parseWhen(textRaw: string, prayer: PrayerData | null): { dueAt: number; repeat: "once" | "daily" | "weekly" } | null {
  const text = normAr(toLatinDigits(textRaw));
  const now = Date.now();
  const repeat: "once" | "daily" | "weekly" = /كل اسبوع|اسبوعيا/.test(text)
    ? "weekly"
    : /كل يوم|يوميا|كل يومين/.test(text)
      ? "daily"
      : "once";

  // بعد X دقيقة / ثانية / ساعة
  const unit = text.match(/بعد\s+(\d+)\s*(دقيق|دقائق|دقايق|د|ساع|ساعات|س|ثاني|ثواني|يوم|ايام)/)
    || text.match(/بعد\s+(نص|ربع|ساعه|ساعة|دقيقه|دقيقة)(?:\s+(\w+))?/);
  if (unit) {
    if (unit[2] !== undefined && /^\d+$/.test(unit[1] || "")) {
      const n = parseInt(unit[1], 10);
      const u = unit[2];
      let ms = 0;
      if (/^د/.test(u)) ms = n * 60000;
      else if (/^س/.test(u)) ms = n * 3600000;
      else if (/^ث/.test(u)) ms = n * 1000;
      else if (/^ي/.test(u)) ms = n * 86400000;
      if (ms) return { dueAt: now + ms, repeat };
    } else {
      const w = unit[1];
      const mult = w === "نص" ? 30 : w === "ربع" ? 15 : /ساع/.test(w) ? 60 : 1;
      return { dueAt: now + mult * 60000 * (mult === 1 ? 1 : mult === 15 ? 1 : 1), repeat };
    }
  }

  // الساعة H(:MM) صباحاً/مساءً
  const clock = text.match(/الساعه\s*(\d{1,2})(?::(\d{1,2}))?\s*(صباح|ص|مساء|م|العصر|الظهر|الليل|المغرب)?/);
  if (clock) {
    let h = parseInt(clock[1], 10);
    const m = clock[2] ? parseInt(clock[2], 10) : 0;
    const suffix = clock[3] || "";
    if (/مساء|الليل|العصر|الظهر|المغرب|^م$/.test(suffix) && h < 12) h += 12;
    if (/صباح|^ص$/.test(suffix) && h === 12) h = 0;
    if (!suffix && h <= 7) h += 12;
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    if (d.getTime() <= now) d.setDate(d.getDate() + (repeat === "weekly" ? 7 : 1));
    if (/بكره|غدا|غدًا/.test(text)) d.setDate(d.getDate() + 1);
    return { dueAt: d.getTime(), repeat };
  }

  // prayer name → its next time today/tomorrow
  if (prayer) {
    const map: [RegExp, keyof typeof prayer.timings][] = [
      [/الفجر|فجر/, "Fajr"], [/الظهر|ظهر/, "Dhuhr"], [/العصر|عصر/, "Asr"],
      [/المغرب|مغرب/, "Maghrib"], [/العشاء|عشاء/, "Isha"],
    ];
    for (const [re, key] of map) {
      if (re.test(text)) {
        const [h, m] = prayer.timings[key].split(":").map(Number);
        const d = new Date(now);
        d.setHours(h, m, 0, 0);
        if (d.getTime() <= now) d.setDate(d.getDate() + 1);
        return { dueAt: d.getTime(), repeat: "daily" };
      }
    }
  }

  // وقت صريح بدون كلمة "الساعة": "٦ صباحاً" / "8 مساء" / "7:30 ص"
  const bare = text.match(/(\d{1,2})(?::(\d{1,2}))?\s*(صباحا|صباح|مساء|مسائ|ص|م)(?![\u0600-\u06FF])/);
  if (bare) {
    let h = parseInt(bare[1], 10);
    const m = bare[2] ? parseInt(bare[2], 10) : 0;
    if (/مساء|مسائ|^م$/.test(bare[3]) && h < 12) h += 12;
    if (/صباح|^ص$/.test(bare[3]) && h === 12) h = 0;
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    if (d.getTime() <= now) d.setDate(d.getDate() + (repeat === "weekly" ? 7 : 1));
    if (/بكره|غدا|غدا|الغد/.test(text)) d.setDate(d.getDate() + 1);
    return { dueAt: d.getTime(), repeat };
  }

  // الليلة → ٩ مساءً
  if (/الليله|الليلة|بالليل|الليل/.test(text) && !/اذكار/.test(text)) {
    const d = new Date(now);
    d.setHours(21, 0, 0, 0);
    if (d.getTime() <= now) d.setDate(d.getDate() + 1);
    return { dueAt: d.getTime(), repeat };
  }

  // الصبح / الفجر بدون ساعة → ٦:٣٠ صباحاً
  if (/الصبح|الفجر/.test(text) && !prayer) {
    const d = new Date(now);
    d.setHours(6, 30, 0, 0);
    if (d.getTime() <= now) d.setDate(d.getDate() + 1);
    return { dueAt: d.getTime(), repeat };
  }

  // غداً بدون تحديد ساعة → ٨ صباحاً
  if (/بكره|غدا|الغد/.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return { dueAt: d.getTime(), repeat };
  }

  // صيغة صريحة "بعد ساعة"
  if (/بعد\s+ساعه|بعد\s+ساعة/.test(text)) return { dueAt: now + 3600000, repeat };
  if (/بعد\s+نص\s+ساعه|بعد\s+نص\s+ساعة/.test(text)) return { dueAt: now + 1800000, repeat };
  if (/بعد\s+ربع\s+ساعه|بعد\s+ربع\s+ساعة/.test(text)) return { dueAt: now + 900000, repeat };
  return null;
}

function nextPrayer(prayer: PrayerData | null): { name: string; time: string; inMin: number } | null {
  if (!prayer) return null;
  const names: [keyof typeof prayer.timings, string][] = [
    ["Fajr", "الفجر"], ["Sunrise", "الشروق"], ["Dhuhr", "الظهر"],
    ["Asr", "العصر"], ["Maghrib", "المغرب"], ["Isha", "العشاء"],
  ];
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  for (const [k, ar] of names) {
    const [h, m] = prayer.timings[k].split(":").map(Number);
    const t = h * 60 + m;
    if (t > mins) return { name: ar, time: prayer.timings[k], inMin: t - mins };
  }
  const [h, m] = prayer.timings.Fajr.split(":").map(Number);
  return { name: "الفجر", time: prayer.timings.Fajr, inMin: 24 * 60 - mins + h * 60 + m };
}

const DEFAULT_CHIPS = [
  "مواقيت الصلاة",
  "ذكرني بأذكار الصباح غداً ٦ صباحاً",
  "شغّل سورة الكهف",
  "فسّر لي سورة الرحمن",
  "فضل الأيام البيض",
  "ذكرني كل يوم الساعة ٩ مساءً بورِد القراءة",
];

/* ---------- main brain ---------- */
export function askMuslim(inputRaw: string, ctx: AssistantContext): AssistantReply {
  const input = (inputRaw || "").trim();
  const t = normAr(toLatinDigits(input));
  const chips = DEFAULT_CHIPS;
  const say = (text: string, actions: AssistantAction[] = [], intent = "chat"): AssistantReply => ({
    text, actions, chips, intent,
  });

  if (!t) return say("اكتب لي أي شيء… أقدر أشغّل لك سورة، أذكّرك، أو أشرح لك معنى آية. 🤍");

  /* ===== identity / help ===== */
  if (/^(السلام|سلام|اهلا|هلا|مرحبا|ازيك|صباح|مساء)/.test(t)) {
    const np = nextPrayer(ctx.prayer);
    return say(
      `وعليكم السلام ورحمة الله وبركاته 🤍\nأنا **مُسلم**، رفيقك داخل «وِرْد». أقدر أشغّل لك القرآن، أفسّر آية، أذكّرك بالأذكار والصلاة على النبي، وأضبط مواعيد تذكير في أي وقت.\n${np ? `أقرب صلاة: **${np.name}** بعد ${AR(np.inMin)} دقيقة.` : ""}`,
      [], "greeting"
    );
  }
  if (/(انت مين|من انت|اسمك|بتعمل ايه|تقدر تعمل|ساعدني|مساعدتك|الاوامر|مساعدة|help)/.test(t)) {
    return say(
      "أنا **مُسلم** 🤖 — مساعدك داخل ورد. هذه أمثلة لما أستطيعه فعلياً:\n\n• «شغّل سورة البقرة بصوت المنشاوي»\n• «افتح المصحف على سورة الرحمن» / «فسّر لي الآية ٥ من البقرة»\n• «ذكرني بعد ٢٠ دقيقة أشرب ماء»\n• «نبّهني كل يوم الساعة ٦ صباحاً بأذكار الصباح»\n• «مواقيت الصلاة» / «أيام الصيام القادمة»\n• «صلّ على النبي» / «أذكار المساء»\n• «نزّل سورة الملك» / «أضف سورة الكهف للمفضلة»\n\nوتقدر تكتب لي أي سؤال عام، وأجاوبك.",
      [
        { kind: "tab", tab: "adhkar" },
        { kind: "tab", tab: "prayer" },
      ], "help"
    );
  }
  if (/(شكرا|جزاك الله|بارك الله|الله يكرمك|تمام جدا|تسلم)/.test(t)) {
    return say("وإياك 🤍 جعلك الله من أهل القرآن. أنا موجود في أي وقت تحتاجه — اضغط على زر **مسلم** في أي قسم.", [], "thanks");
  }

  /* ===== notifications enable/disable ===== */
  if (/(الاشعارات|الاشعار|نتفكيشن|تنبيهات|notification)/.test(t) && /(شغل|فعل|فعل|اوف|اقفل|وقف|من غير|بدون)/.test(t)) {
    const enable = !/(اقفل|وقف|الغ|بدون|من غير|اطفي|اوقف)/.test(t);
    return say(
      enable
        ? "تمام، هاشغّل الإشعارات. لو المتصفح طلب إذن، اضغط «سماح» — وبعدها هنبّهك في المواقيت والأذكار وكل ما تطلبه. ✅"
        : "أوقفت الإشعارات. تقدر ترجّعها في أي وقت من زر الجرس 🔔 أو تقول لي «شغّل الإشعارات».",
      [{ kind: "notifications", enabled: enable }], "notifications"
    );
  }

  /* ===== reminder listing / deleting ===== */
  if (/(مواعيد التذكير|تذكيراتي|المنبهات|قائمة التذكير)/.test(t)) {
    return say(
      "كل تذكيراتك موجودة في مركز الإشعارات (زر الجرس 🔔 بالأعلى) — تقدر تحذف أو تعدّل أي تذكير من هناك.",
      [{ kind: "tab", tab: "prayer" }], "list_reminders"
    );
  }

  /* ===== create reminder ===== */
  if (/(ذكرني|فكرني|نبهني|تذكير|منبه|ابلغني|قولي لي بعد)/.test(t)) {
    const when = parseWhen(input, ctx.prayer);
    const aboutMatch = t
      .replace(/^(يا مسلم[,،]?\s*)/, "")
      .replace(/(ذكرني|فكرني|نبهني|تذكير|ابلغني|قولي لي|عايز تذكرني)/g, "")
      .replace(/(بعد|كل|في)\s+[\d٠-٩]+\s*(دقيقه|دقايق|دقائق|دقيق|ساع|ساعات|ساعه|ثاني|ثواني|يوم|ايام)\S*/g, "")
      .replace(/بعد\s+(نص|ربع)?\s*(ساعه|ساعة|دقيقه|دقيقة)/g, "")
      .replace(/\bبعد\b/g, "")
      .replace(/[\d٠-٩]{1,2}\s*(?::\s*[\d٠-٩]{1,2})?\s*(صباحا|صباحاً|صباح|مساء|مساءً|مسائ|ص|م)/g, "")
      .replace(/(الساعة|الساعه)\s*[\d٠-٩:]+\s*(صباحا|صباحاً|مساء|مساءً|ص|م)?/g, "")
      .replace(/(غدا|غداً|الغد|بكره|بكرا|يوميا|كل يوم|كل اسبوع|اسبوعيا|الليلة)/g, "")
      .replace(/\bبعد\b|\bبـ\b/g, "")
      .trim();
    const about = aboutMatch.replace(/^ب(?=\S)/, "").replace(/^عن\s+/, "").replace(/^ب\s+/, "").trim() || "بأي شيء يخص وِردك اليومي";
    if (!when) {
      return say(
        "حاضر، بس حدّد لي الوقت 🤍\nمثال: «ذكرني بعد ٢٠ دقيقة أشرب ماء» أو «نبهني كل يوم الساعة ٦ صباحاً بأذكار الصباح».",
        [], "reminder_needs_time"
      );
    }
    const friendly = about.length > 90 ? about.slice(0, 90) + "…" : about;
    const typeGuess: AssistantAction = {
      kind: "reminder",
      title: "تذكير من مُسلم 🤍",
      body: friendly,
      dueAt: when.dueAt,
      repeat: when.repeat,
    };
    const whenLabel = new Date(when.dueAt).toLocaleString("ar-EG", {
      weekday: "short", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short",
    });
    return say(
      `تمام ✅ ضبطت لك التذكير:\n\n🕒 **${whenLabel}**\n📌 ${friendly}\n${when.repeat === "daily" ? "\nيتكرر كل يوم تلقائياً." : when.repeat === "weekly" ? "\nيتكرر كل أسبوع." : ""}\n\nلو الإشعارات مسموحة هتلاقي تنبيه على جهازك، وهتشوفه أيضًا داخل التطبيق في وقته.`,
      [typeGuess], "reminder_created"
    );
  }

  /* ===== prayer times ===== */
  if (/(مواقيت|وقت الصلا|الصلاة القادمه|الصلاة الجايه|الاقامه|الاذان|امتى\s+الصلا)/.test(t)) {
    if (!ctx.prayer) return say("لسه بجيب مواقيت الصلاة… افتح قسم «مواقيت الصلاة» ثانية واحدة وأكون جاهز. 🕌", [{ kind: "tab", tab: "prayer" }], "prayer");
    const np = nextPrayer(ctx.prayer);
    const tm = ctx.prayer.timings;
    return say(
      `مواقيت اليوم في **${ctx.cityLabel}** 🕌\n\nالفجر ${tm.Fajr}\nالشروق ${tm.Sunrise}\nالظهر ${tm.Dhuhr}\nالعصر ${tm.Asr}\nالمغرب ${tm.Maghrib}\nالعشاء ${tm.Isha}\n\n${np ? `⏳ أقرب صلاة: **${np.name}** بعد ${AR(np.inMin)} دقيقة.` : ""}\n\nهجرياً: ${ctx.prayer.hijri.day} ${ctx.prayer.hijri.month.ar} ${ctx.prayer.hijri.year}هـ`,
      [{ kind: "tab", tab: "prayer" }], "prayer"
    );
  }

  if (/(الايام البيض|فضل الصيام|فضل الصوم|ثواب الصيام)/.test(t)) {
    return say(
      "🌙 **فضل الصيام:**\n• صيام الأيام البيض (١٣، ١٤، ١٥) كصيام الدهر كله.\n• الإثنين والخميس تُعرض فيهما الأعمال، وكان ﷺ يحب أن يُعرض عمله وهو صائم.\n• عاشوراء يكفّر السنة الماضية، وعرفة يكفّر سنتين لغير الحاج.\n• الست من شوال مع رمضان كصيام الدهر.\n\nتحب أذكّرك بليلة الأيام البيض القادمة؟",
      [{ kind: "tab", tab: "prayer" }], "fasting_virtue"
    );
  }

  /* ===== fasting / hijri ===== */
  if (/(صيام|صوم|الايام البيض|عاشوراء|عرفه|الست من شوال|الهجري|التاريخ|الشهر)/.test(t)) {
    const list = ctx.fasting.slice(0, 4).map((f) => `• **${f.title}** — ${f.when}${f.daysLeft !== null ? ` (بعد ${AR(f.daysLeft)} يوم)` : ""}`).join("\n");
    const hijri = ctx.prayer ? `\n\n📅 اليوم: ${ctx.prayer.hijri.day} ${ctx.prayer.hijri.month.ar} ${ctx.prayer.hijri.year}هـ` : "";
    return say(
      `أيام الصيام المستحبة القادمة 🌙\n\n${list || "راجع قسم المواقيت لتفاصيل الأيام البيض والإثنين والخميس."}${hijri}\n\nاسألني عن فضل أي يوم وأشرحه لك.`,
      [{ kind: "tab", tab: "prayer" }], "fasting"
    );
  }
  /* ===== adhkar ===== */
  if (/(اذكار|الذكر|ورد الصباح|ورد المساء|الصباح|المساء)/.test(t)) {
    const isEvening = /(مساء|الليل|المساء)/.test(t);
    return say(
      `${isEvening ? "🌙 أذكار المساء" : "☀️ أذكار الصباح"} جاهزة في قسم الأذكار.\n\nتقدّمك اليومي: ${AR(ctx.adhkarDone)} من ${AR(ctx.adhkarTotal)} ذكر.\n\n${isEvening ? "«أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ»" : "«أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ»"}\n\nهمّتك عالية — كل ذكر يبني حصناً حولك.`,
      [{ kind: "tab", tab: "adhkar" }], "adhkar"
    );
  }

  /* ===== salawat ===== */
  if (/(صل علي النبي|صل علي|صلي علي النبي|صلوا علي النبي|صلوات|الصلاه علي النبي|الصلاة على النبي|صلى الله عليه|عليه الصلاة|صل عليه|اصلي علي النبي|صلي علي النبي)/.test(t)
    && !/(مواقيت|مواعيد|وقت|توقيت|اذان|الفجر|الظهر|العصر|المغرب|العشاء|قضاء|فائت)/.test(t)) {
    return say(
      `اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ ﷺ\n\nتم تسجيل صلاة على النبي — وصلّيت ${AR(ctx.salawatCount + 1)} مرة داخل ورد. أجر عظيم بإذن الله 🤍\n\nتحب أذكّرك بها كل ${AR(2)} ساعات؟`,
      [{ kind: "salawat" }], "salawat"
    );
  }

  /* ===== play surah ===== */
  if (/(شغل|سمعني|افتح صوت|ابدا|ابدأ|تشغيل|play)/.test(t)) {
    const surah = findSurah(t, ctx.surahs);
    if (!surah) return say("تحب تسمع أي سورة؟ اكتب اسمها مثل «شغّل سورة الرحمن» أو رقمها «شغّل سورة ٣٦» 🎧", [{ kind: "tab", tab: "surahs" }], "play_need_surah");
    const reciter = findReciter(t, ctx.reciters);
    return say(
      `▶️ جاري تشغيل **سورة ${surah.name}**${reciter ? ` بصوت **${reciter.name}**` : ctx.selectedReciterName ? ` بصوت **${ctx.selectedReciterName}**` : ""}.\n\n${surah.numberOfAyahs} آية • ${surah.revelationType.includes("Meccan") ? "مكية" : "مدنية"}.\n\nتقدر تحمّلها للاستماع بدون نت من زر «حفظ بدون نت» في المشغّل.`,
      [{ kind: "play", surah: surah.number, reciterId: reciter?.id }], "play"
    );
  }

  /* ===== read / tafsir ===== */
  if (/(اقرا|اقرأ|افتح|المصحف|تفسير|فسر|معنى|وريني|اعرض)/.test(t)) {
    const surah = findSurah(t, ctx.surahs) || (/(متابعة|اخر قراءة|آخر قراءة)/.test(t) ? ctx.surahs[0] : null);
    if (!surah) return say("اكتب لي اسم السورة اللي تحب أفتحها، مثل «فسّر لي سورة الرحمن» 📖", [{ kind: "tab", tab: "mushaf" }], "read_need_surah");
    const wantsTafsir = /(تفسير|فسر|معنى|اشرح|وضح)/.test(t);
    return say(
      `📖 فتحت لك **سورة ${surah.name}**${wantsTafsir ? " مع التفسير الميسر لكل آية" : ""}.\nاضغط على أي آية لعرض تفسيرها ونسخها.\n\nالفهرسة مخزّنة على جهازك، فالقراءة تعمل بدون إنترنت.`,
      [{ kind: "read", surah: surah.number, tafsir: wantsTafsir }, { kind: "tab", tab: "mushaf" }], "read"
    );
  }

  /* ===== favorite ===== */
  if (/(مفضله|المفضله|ضيف.*مفضل|اضف.*مفضل|حفظ.*مفضل)/.test(t) && !/(حمل|نزل|تحميل)/.test(t)) {
    const surah = findSurah(t, ctx.surahs);
    if (!surah) return say("أي سورة تحب أضيفها للمفضلة؟ اكتب اسمها 🤍", [], "fav_need_surah");
    const already = ctx.favSurahs.includes(surah.number);
    return say(
      already ? `سورة **${surah.name}** موجودة فعلاً في مفضلتك ⭐` : `تمت إضافة **سورة ${surah.name}** إلى المفضلة ⭐ — تجدها في قسم المفضلة.`,
      already ? [{ kind: "tab", tab: "favs" }] : [{ kind: "favorite", surah: surah.number }], "favorite"
    );
  }

  /* ===== download ===== */
  if (/(حمل|نزل|تحميل|بدون نت)/.test(t)) {
    const surah = findSurah(t, ctx.surahs);
    if (!surah) return say("أي سورة تحب أحفظها لك للاستماع بدون إنترنت؟ 🎧", [], "download_need_surah");
    return say(
      `⏳ بدأت حفظ **سورة ${surah.name}** على جهازك. تقدر تتابع التقدم في المشغّل وأيضاً قسم المفضلة → «صوتيات محفوظة بدون نت».\n\nإجمالي المحفوظ لديك: ${AR(ctx.savedCount)} سورة.`,
      [{ kind: "download", surah: surah.number }], "download"
    );
  }

  /* ===== search reciter ===== */
  if (/(قارئ|قاري|شيخ|قراء|دور علي|دور على|ابحث|ابحثلي|لاقي|عايز اسمع)/.test(t)) {
    const rec = findReciter(t, ctx.reciters);
    if (rec) {
      return say(
        `🎙️ لقيت لك **${rec.name}** — ${rec.moshaf.length} رواية (${rec.moshaf.map((m) => m.name).slice(0, 2).join(" / ")}).\nفاتح لك صفحته الآن.`,
        [{ kind: "search", query: rec.name }, { kind: "tab", tab: "reciters" }], "reciter"
      );
    }
    return say(
      "عندنا **٢٤٤ قارئاً** من مصر والعالم العربي، بالإضافة إلى الشيخ **حسين العزام** في التسجيلات المختارة.\nاكتب اسم القارئ وأفتح لك صفحته مباشرة 🎙️",
      [{ kind: "tab", tab: "reciters" }], "reciter_search"
    );
  }

  /* ===== handy knowledge ===== */
  const knowledge: [RegExp, string][] = [
    [/عدد السور|كام سوره|كم سوره/, "عدد سور القرآن الكريم **١١٤ سورة**، منها ٨٦ مكية و٢٨ مدنية، ومجموع الآيات ٦٢٣٦ آية في ٣٠ جزءاً. 📖"],
    [/اطول سوره|أطول سوره|السوره الاطول/, "أطول سور القرآن **سورة البقرة** (٢٨٦ آية)، وأقصرها **سورة الكوثر** (٣ آيات)."],
    [/ايه الكرسي|آية الكرسي/, "آية الكرسي هي الآية **٢٥٥ من سورة البقرة**: ﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ…﴾، ومن قرأها حين يصبح أُجير من الجن حتى يمسي."],
    [/ورد|الورد|حزب|ختمه|ختمه القران/, "عشان تحافظ على وِردك: ابدأ بجزء صغير ثابت يومياً (صفحة أو صفحتين)، اربطه بصلاة معروفة، واستخدم قسم المصحف مع التفسير الميسر. أقدر أذكّرك يومياً — قول لي «ذكرني كل يوم الساعة ٩ مساءً بورِد القراءة» 🤍"],
    [/ازاي احفظ|كيف احفظ|حفظ القران/, "خطة عملية للحفظ: ١) صفحة جديدة كل يوم بعد الفجر. ٢) مراجعة الصفحات القديمة بعد العصر. ٣) سماع القارئ قبل الحفظ. ٤) ثبّت الورد وتأكد أنك لا تتجاوزه إلا بمراجعة. وأنا أذكّرك بكل موعد تحبه. 📖"],
  ];
  for (const [re, ans] of knowledge) if (re.test(t)) return say(ans, [], "knowledge");

  /* ===== fallback ===== */
  return say(
    "فهمت عليك 🤍 بس محتاج أوضح شوية عشان أنفّذ صح.\nجرّب: «شغّل سورة يس»، «فسّر سورة الملك»، «ذكرني بعد ساعة أقرأ وِردي»، «مواقيت الصلاة»، «فضل الأيام البيض»، أو «صلّ على النبي».\n\nوتقدر تسألني أي سؤال عام — ولو ربطت مفتاح ذكاء اصطناعي من ⚙️ هجاوبك بتفصيل أكبر.",
    [{ kind: "tab", tab: "surahs" }], "fallback"
  );
}

/* ============ optional cloud AI (user-provided key, stored locally) ============ */
export interface AIConfig {
  enabled: boolean;
  key: string;
  model: string;
  baseUrl: string;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  enabled: false,
  key: "",
  model: "gpt-4o-mini",
  baseUrl: "https://api.openai.com/v1",
};

export function buildSystemPrompt(ctx: AssistantContext): string {
  const p = ctx.prayer;
  return [
    "أنت «مُسلم»، مساعد ذكي داخل تطبيق «وِرْد» للقرآن الكريم (عربي RTL).",
    "أجب دائماً بالعربية الفصحى المبسطة، بإيجاز ولطف، وبأسلوب إسلامي محترم مع إيموجي خفيف.",
    "مهمتك: مساعدة المستخدم في القرآن والتفسير والأذكار ومواقيت الصلاة والصيام والتذكيرات، والإجابة عن أسئلته العامة بصدق ووضوح.",
    "لا تفتري على الله، ووضّح إن التفسير للقراءة العامة وليس فتوى شرعية عند الأسئلة الفقهية الدقيقة، ووجّه لسؤال أهل العلم.",
    "لا تقل إنك تنفّذ إجراءات في التطبيق؛ الإجراءات ينفّذها مساعد ورد المحلي. ركّز على الشرح والإجابة.",
    p ? `سياق: المدينة ${ctx.cityLabel}، التاريخ الهجري ${p.hijri.day} ${p.hijri.month.ar} ${p.hijri.year}هـ، مواقيت اليوم: الفجر ${p.timings.Fajr}، الظهر ${p.timings.Dhuhr}، العصر ${p.timings.Asr}، المغرب ${p.timings.Maghrib}، العشاء ${p.timings.Isha}.` : "",
    `أيام الصيام المستحبة: ${ctx.fasting.map((f) => `${f.title} (${f.when})`).join("، ")}.`,
  ].filter(Boolean).join("\n");
}

export interface ChatTurn { role: "user" | "assistant"; content: string }

export async function callCloudAI(cfg: AIConfig, ctx: AssistantContext, history: ChatTurn[], userText: string): Promise<string> {
  if (!cfg.enabled || !cfg.key.trim()) throw new Error("no-key");
  const base = (cfg.baseUrl || DEFAULT_AI_CONFIG.baseUrl).replace(/\/$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.key.trim()}`,
    },
    body: JSON.stringify({
      model: cfg.model || "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 700,
      messages: [
        { role: "system", content: buildSystemPrompt(ctx) },
        ...history.slice(-8),
        { role: "user", content: userText },
      ],
    }),
  });
  if (!res.ok) throw new Error("ai-" + res.status);
  const json = await res.json();
  const txt = json?.choices?.[0]?.message?.content;
  if (!txt) throw new Error("ai-empty");
  return String(txt).trim();
}

/* ============================================================
   Smart layer — offline Quran retrieval + tafsir + free cloud AI
   ============================================================ */

const STOP_WORDS = new Set([
  "ابحث","دور","هات","اعرض","لي","عن","في","من","على","الي","ايه","آية","ايات","آيات",
  "قران","القران","الكريم","سوره","سورة","كلمه","كلمة","ورد","وورد","اين","اين","هل",
  "ماذا","ايه","اي","اللي","التي","الذي","معنى","تفسير","فسر","اشرح","وضح","قولي",
  "عايز","اعرف","معلومات","شيء","حاجه","حاجة","كل","بعض","و","او","ثم",
]);

export function keywordsOf(text: string): string[] {
  const n = normAr(toLatinDigits(text)).replace(/[^\u0621-\u064A\s]/g, " ");
  return Array.from(new Set(
    n.split(/\s+/).map((w) => w.trim()).filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
  )).slice(0, 6);
}

export interface VerseHit {
  surah: number;
  surahName: string;
  ayah: number;
  text: string;
  tafsir: string;
}

interface VerseRow {
  surah: number;
  surahName: string;
  ayah: number;
  plain: string;
  raw: string;
  tafsir: string;
}
let VERSE_INDEX: VerseRow[] | null = null;

async function buildIndex(): Promise<VerseRow[]> {
  if (VERSE_INDEX) return VERSE_INDEX;
  const [{ getOfflineTexts, getOfflineTafsir, offlineSurahMeta }, { normAr: _n }] = await Promise.all([
    import("./offline"), import("./api"),
  ]);
  void _n;
  const [texts, tafs] = await Promise.all([getOfflineTexts(), getOfflineTafsir()]);
  const meta = offlineSurahMeta();
  const out: VerseRow[] = [];
  for (let s = 0; s < texts.length; s++) {
    const taf = tafs[s] || [];
    for (let a = 0; a < texts[s].length; a++) {
      out.push({
        surah: s + 1,
        surahName: meta[s]?.name || `سورة ${s + 1}`,
        ayah: a + 1,
        raw: texts[s][a],
        plain: normAr(texts[s][a]),
        tafsir: taf[a] || "",
      });
    }
  }
  VERSE_INDEX = out;
  return out;
}

/** Real full-text search across all 6236 ayahs (offline, instant) */
export async function searchVerses(query: string, limit = 4): Promise<VerseHit[]> {
  const kws = keywordsOf(query);
  if (!kws.length) return [];
  const idx = await buildIndex();
  const scored: { hit: VerseHit; score: number }[] = [];
  for (const v of idx) {
    let score = 0;
    for (const k of kws) {
      if (v.plain.includes(k)) score += k.length >= 5 ? 3 : 2;
      if (v.tafsir && normAr(v.tafsir).includes(k)) score += 0.6;
    }
    if (score >= 2) {
      scored.push({
        hit: { surah: v.surah, surahName: v.surahName, ayah: v.ayah, text: v.raw, tafsir: v.tafsir },
        score: score - v.raw.length / 4000,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.hit);
}

/** Tafsir for one exact ayah */
export async function tafsirOf(surah: number, ayah: number): Promise<VerseHit | null> {
  const idx = await buildIndex();
  const found = idx.find((v) => v.surah === surah && v.ayah === ayah);
  if (!found) return null;
  return { surah, surahName: found.surahName, ayah, text: found.raw, tafsir: found.tafsir };
}

function parseAyahRef(text: string): { surahName: string; ayah: number } | null {
  const t = normAr(toLatinDigits(text));
  const num = t.match(/(?:الايه|الآيه|ايه|آيه|اية|الاية)\s*(?:رقم\s*)?(\d{1,3})/);
  const num2 = t.match(/(\d{1,3})\s*(?:من|في)\s*(?:سوره|سورة)?/);
  const ayah = num ? parseInt(num[1], 10) : num2 ? parseInt(num2[1], 10) : NaN;
  if (!isFinite(ayah) || ayah < 1) return null;
  const su = t.replace(/(?:الايه|الآيه|ايه|آيه|اية|الاية)\s*(?:رقم\s*)?\d{1,3}/, " ").trim();
  return { surahName: su, ayah };
}

const DUAS: { re: RegExp; title: string; text: string; source: string }[] = [
  { re: /(هم|حزن|ضيق|كرب|قلق|خوف)/, title: "دعاء الهم والحزن", text: "اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ، أَصْبَحْتُ عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.", source: "رواه أحمد" },
  { re: /(رزق|مال|وظيف|عمل|فلوس)/, title: "دعاء الرزق", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا.", source: "ابن ماجه" },
  { re: /(شفاء|مرض|وجع|تعب|صحة)/, title: "دعاء الشفاء", text: "اللَّهُمَّ رَبَّ النَّاسِ، أَذْهِبِ الْبَاسَ، اشْفِ أَنْتَ الشَّافِي، لَا شَافِيَ إِلَّا أَنْتَ.", source: "متفق عليه" },
  { re: /(توبه|ذنب|استغفار|معصيه)/, title: "سيد الاستغفار", text: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.", source: "البخاري" },
  { re: /(زوج|زواج|اهل|بيت|ولد|ذرية)/, title: "دعاء الذرية الصالحة", text: "رَبِّ هَبْ لِي مِنَ الصَّالِحِينَ. رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا.", source: "الصافات ١٠٠ / الفرقان ٧٤" },
  { re: /(سفر|سفر|سفر)/, title: "دعاء السفر", text: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ. اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى.", source: "صحيح مسلم" },
];

export interface SmartOptions {
  aiConfig?: AIConfig;
  online?: boolean;
}

/* free, key-less AI endpoint (optional network) */
async function callFreeAI(system: string, history: ChatTurn[], userText: string, ms = 11000): Promise<string> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        temperature: 0.55,
        max_tokens: 650,
        messages: [{ role: "system", content: system }, ...history.slice(-6), { role: "user", content: userText }],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error("free-" + res.status);
    const json = await res.json();
    const txt = json?.choices?.[0]?.message?.content;
    if (!txt) throw new Error("free-empty");
    return String(txt).trim();
  } finally { clearTimeout(id); }
}

function buildRagContext(hits: VerseHit[]): string {
  if (!hits.length) return "";
  return [
    "آيات من القرآن الكريم (رسم عثماني) مسترجعة من نسخة التطبيق الموثقة — استخدمها كمرجع دقيق ولا تحرّفها:",
    ...hits.slice(0, 3).map((h) => `﴿${h.text}﴾ [${h.surahName}: ${h.ayah}] — التفسير الميسر: ${h.tafsir.slice(0, 380)}`),
  ].join("\n");
}

/** The full brain: local NLU → Quran retrieval → cloud AI → local fallback */
export async function askMuslimSmart(
  input: string,
  ctx: AssistantContext,
  history: ChatTurn[] = [],
  opts: SmartOptions = {}
): Promise<AssistantReply> {
  const t = normAr(toLatinDigits(input));
  const local = askMuslim(input, ctx);
  const chips = local.chips;

  /* 1) exact ayah tafsir */
  if (/(تفسير|فسر|اشرح|معنى|وضح)/.test(t) && /(ايه|آيه|اية|الايه|الآية)/.test(t)) {
    const ref = parseAyahRef(input);
    if (ref) {
      const surah = findSurahByName(ref.surahName, ctx.surahs);
      if (surah) {
        const hit = await tafsirOf(surah.number, ref.ayah);
        if (hit) {
          return {
            text: `📖 **${hit.surahName} — الآية ${AR(hit.ayah)}**\n\n﴿${hit.text}﴾\n\n**التفسير الميسر:**\n${hit.tafsir}\n\nهل تريد فتح السورة عند هذه الآية؟`,
            actions: [{ kind: "read", surah: surah.number, tafsir: true }, { kind: "tab", tab: "mushaf" }],
            chips, intent: "tafsir_ayah",
          };
        }
      }
    }
  }

  /* 2) Quran search ("آية فيها ...", "آيات عن ...", "ابحث ...) */
  if (/(ايه|آيه|ايات|آيات|اين|اينما|ابحث|هات|دور في القران|في القران)/.test(t) && !/(ذكرني|نبهني|فكرني)/.test(t)) {
    const kws = keywordsOf(input);
    if (kws.length) {
      const hits = await searchVerses(input, 4);
      if (hits.length) {
        const blocks = hits.map((h, i) =>
          `**${AR(i + 1)}) ﴿${h.text}﴾**\n[${h.surahName}: ${AR(h.ayah)}]\n_${h.tafsir.slice(0, 240)}${h.tafsir.length > 240 ? "…" : ""}_`
        ).join("\n\n");
        return {
          text: `🔎 لقيت لك ${AR(hits.length)} نتائج من المصحف مرتبطة بـ «${kws.join(" ")}»:\n\n${blocks}\n\nاضغط «افتح السورة» لقراءتها بالتفسير الكامل، وأنا أشرح أي آية بالتفصيل.`,
          actions: [{ kind: "read", surah: hits[0].surah, tafsir: true }, { kind: "tab", tab: "mushaf" }],
          chips: ["فسّر الآية الأولى", "شغّل السورة", "ابحث عن آيات الصبر", "خطة وِرد يومية"],
          intent: "quran_search",
        };
      }
    }
  }

  /* 3) duas */
  if (/(دعاء|ادعيه|ادعيه|دعي)/.test(t)) {
    const found = DUAS.find((d) => d.re.test(t));
    if (found) {
      return {
        text: `🤲 **${found.title}**\n\n${found.text}\n\n📚 ${found.source}\n\nأقدر أذكّرك بهذا الدعاء في أي وقت تقوله.`,
        actions: [{ kind: "tab", tab: "adhkar" }], chips, intent: "dua",
      };
    }
  }

  /* 4) wird plan */
  if (/(خطه|خطة|برنامج|جدول|نظام|روتين)/.test(t) && /(ورد|قران|قراءة|حفظ|مراجعه)/.test(t)) {
    return {
      text:
        "📋 **خطة وِرْد أسبوعية واقعية (تبدأ من ١٠ دقائق):**\n\n" +
        "**يومياً**\n• بعد الفجر: صفحة جديدة حفظ/قراءة (٥ دقائق)\n• بعد العصر: مراجعة أمس (٣ دقائق)\n• بعد المغرب: تلاوة صفحة مع التفسير الميسر (٥ دقائق)\n• قبل النوم: أذكار المساء + صلاة على النبي ١٠ مرات\n\n" +
        "**أسبوعياً**\n• الجمعة: سورة الكهف\n• السبت: مراجعة الأسبوع السابق كاملاً\n• الأحد: يوم استراحة (سماع فقط)\n\n" +
        "**قاعدة الثبات:** القليل الدائم خير من الكثير المنقطع.\n\n" +
        "تحب أضبط لك التذكيرات اليومية لكل وِرد؟ ",
      actions: [
        { kind: "reminder", title: "وِردك اليومي 📖", body: "صفحة جديدة بعد الفجر + مراجعة بعد العصر.", dueAt: Date.now() + 16 * 60000, repeat: "daily" },
        { kind: "tab", tab: "mushaf" },
      ],
      chips: ["ذكرني بعد ساعة أقرأ وِردي", "خطة حفظ القرآن", "فسّر سورة الرحمن", "مواقيت الصلاة"],
      intent: "plan",
    };
  }

  /* 5) cloud AI: user key, then free endpoint for truly open questions */
  const fallbackish = ["fallback", "quran_search", "dua", "knowledge"].includes(local.intent) || /[?؟]/.test(input);
  if (fallbackish && opts.online !== false) {
    const hits = await searchVerses(input, 3).catch(() => []);
    const system = [
      buildSystemPrompt(ctx),
      "أنت مساعد ذكي متعدد القدرات داخل وِرْد. أجب إجابة منظّمة موجزة (نقاط قصيرة) وبأسلوب دافئ واقعي.",
      "إن سُئلت عن آية أو تفسير فاعتمد النص المسترجع أدناه فقط، وإن لم يوجد فقل إنك ستحتاج فتح المصحف.",
      buildRagContext(hits),
    ].join("\n\n");
    try {
      let answer = "";
      if (opts.aiConfig?.enabled && opts.aiConfig.key.trim()) {
        answer = await callCloudAI(opts.aiConfig, ctx, history, input);
      } else {
        answer = await callFreeAI(system, history, input);
      }
      if (answer) {
        const extra = hits.length
          ? `\n\n📖 ومن المصحف: ﴿${hits[0].text}﴾ — [${hits[0].surahName}: ${AR(hits[0].ayah)}]`
          : "";
        return {
          text: answer + extra,
          actions: hits.length ? [{ kind: "read", surah: hits[0].surah, tafsir: false }] : [],
          chips, intent: "ai",
        };
      }
    } catch {
      // fall through to local answer
    }
  }

  /* 6) local fallback + helpful search */
  if (local.intent === "fallback") {
    const hits = await searchVerses(input, 2).catch(() => []);
    if (hits.length) {
      return {
        text: `فهمت سؤالك 🤍 ودي أقرب آيات من المصحف:\n\n${hits.map((h) => `﴿${h.text}﴾\n[${h.surahName}: ${AR(h.ayah)}]`).join("\n\n")}\n\nتقدر تسألني: «فسّر الآية الأولى»، «شغّل السورة»، أو أي شيء آخر.`,
        actions: [{ kind: "read", surah: hits[0].surah, tafsir: true }],
        chips, intent: "fallback_search",
      };
    }
  }
  return local;
}

export function findSurahByName(q: string, surahs: SurahMeta[]): SurahMeta | null {
  const norm = normAr(q);
  return (
    surahs.find((s) => normAr(s.name) === norm) ||
    surahs.find((s) => normAr(s.name).includes(norm) || norm.includes(normAr(s.name))) ||
    null
  );
}
