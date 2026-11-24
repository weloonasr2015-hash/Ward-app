import { useCallback, useEffect, useState } from "react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent || "");
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if ((navigator as unknown as { standalone?: boolean }).standalone === true) return true;
    if (document.referrer.startsWith("android-app://")) return true;
  } catch { /* ignore */ }
  return false;
}

export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  return (window as unknown as { __WS_NATIVE__?: boolean }).__WS_NATIVE__ === true;
}

export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isStandalone() || isNative());
  const [ios] = useState<boolean>(() => isIOS());

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    const onDisplay = () => {
      if (isStandalone()) setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    window.matchMedia("(display-mode: standalone)").addEventListener?.("change", onDisplay);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferred) return false;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice?.outcome === "accepted") {
        setDeferred(null);
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }, [deferred]);

  return {
    canInstall: !!deferred && !installed,
    installed,
    ios,
    showIosHint: ios && !installed,
    install,
  };
}

/** Deep-link from PWA shortcuts: ?tab=mushaf etc. */
export function consumeLaunchTab(): string | null {
  try {
    const t = new URLSearchParams(window.location.search).get("tab");
    const valid = ["surahs", "reciters", "mushaf", "adhkar", "prayer", "favs"];
    if (t && valid.includes(t)) {
      window.history.replaceState({}, "", window.location.pathname);
      return t;
    }
  } catch { /* ignore */ }
  return null;
}
