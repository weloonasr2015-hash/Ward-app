import { motion } from "framer-motion";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "../utils/cn";

export function Equalizer({ playing = true, className }: { playing?: boolean; className?: string }) {
  return (
    <span className={cn("eq", !playing && "eq-paused", className)}>
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

export function FavHeart({
  active,
  onToggle,
  size = 18,
}: {
  active: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: number;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label="مفضلة"
      className={cn(
        "active:scale-90 transition-all duration-150 grid place-items-center rounded-full w-9 h-9 border",
        active
          ? "bg-teal-400/15 border-teal-300/60 text-teal-300 shadow-[0_0_16px_rgba(143,191,154,0.45)]"
          : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-teal-200 hover:border-teal-300/40 hover:shadow-[0_0_16px_rgba(143,191,154,0.25)]"
      )}
    >
      <span key={String(active)} className={active ? "heart-pop inline-flex" : "inline-flex"}>
        <Heart size={size} fill={active ? "currentColor" : "none"} strokeWidth={2.2} />
      </span>
    </button>
  );
}

export function SectionHead({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      {icon && (
        <div className="shrink-0 w-11 h-11 rounded-2xl grid place-items-center bg-gradient-to-br from-teal-400/20 to-teal-900/30 border border-teal-300/25 text-teal-200 shadow-[0_0_18px_rgba(143,191,154,0.15)]">
          {icon}
        </div>
      )}
      <div>
        <h2 className="font-ruqaa text-2xl md:text-[28px] leading-tight text-[#f6efdf]">{title}</h2>
        {subtitle && <p className="font-tajawal text-[13px] text-teal-100/60 mt-1 leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="skeleton h-5 w-2/3 rounded-lg" />
      <div className="skeleton h-4 w-full rounded-lg" />
      <div className="skeleton h-4 w-1/2 rounded-lg" />
    </div>
  );
}

export function SkeletonGrid({ n = 8 }: { n?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: n }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="glass rounded-2xl p-8 text-center space-y-3">
      <p className="font-amiri text-lg text-rose-200">{message}</p>
      <button
        onClick={onRetry}
        className="px-5 py-2 rounded-xl bg-teal-500/15 border border-teal-300/30 text-teal-100 text-sm font-bold hover:bg-teal-500/25 active:scale-95 transition-all"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}

export function LoadingInline({ label = "جارٍ التحميل..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-teal-200/80 text-sm">
      <Loader2 className="animate-spin" size={18} />
      <span className="font-tajawal">{label}</span>
    </div>
  );
}

export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.2, 0.8, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
