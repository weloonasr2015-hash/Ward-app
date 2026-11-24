import { useCallback, useEffect, useState } from "react";

const FORCE_OFFLINE_KEY = "ws_force_offline";
const EVENT = "ws-network-change";

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

/** User chose "غير متصل" manually from the status switch */
export function getForceOffline(): boolean {
  try {
    return localStorage.getItem(FORCE_OFFLINE_KEY) === "1";
  } catch {
    return false;
  }
}

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function setForceOffline(value: boolean): void {
  try {
    localStorage.setItem(FORCE_OFFLINE_KEY, value ? "1" : "0");
  } catch { /* ignore */ }
  notify();
}

export function toggleForcedOffline(): boolean {
  const next = !getForceOffline();
  setForceOffline(next);
  return next;
}

/**
 * Whether network requests are allowed right now.
 * False if the browser is offline OR the user manually switched to غير متصل.
 */
export function isNetworkAllowed(): boolean {
  return isOnline() && !getForceOffline();
}

export interface ConnectionState {
  /** effective status used across the app */
  online: boolean;
  /** real browser connectivity */
  browserOnline: boolean;
  /** user manually selected offline */
  manualOffline: boolean;
  /** flip between متصل / غير متصل (manual override) */
  toggle: () => void;
  /** re-enable connection explicitly */
  connect: () => void;
}

export function useConnection(): ConnectionState {
  const [browserOnline, setBrowserOnline] = useState<boolean>(() => isOnline());
  const [manualOffline, setManualOffline] = useState<boolean>(() => getForceOffline());

  useEffect(() => {
    const sync = () => {
      setBrowserOnline(isOnline());
      setManualOffline(getForceOffline());
    };
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  const toggle = useCallback(() => {
    // If currently shown as connected (online + not forced) → switch offline.
    // If already offline (manual or browser) → try to restore connection.
    const currentlyOn = isOnline() && !getForceOffline();
    setForceOffline(currentlyOn);
  }, []);

  const connect = useCallback(() => setForceOffline(false), []);

  return {
    online: browserOnline && !manualOffline,
    browserOnline,
    manualOffline,
    toggle,
    connect,
  };
}

/** Backwards-compatible boolean hook */
export function useOnline(): boolean {
  return useConnection().online;
}
