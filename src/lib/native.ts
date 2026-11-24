import { Capacitor } from "@capacitor/core";

/** True when running inside the native Android/iOS wrapper */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Native shell setup:
 * - dark teal status bar matching the app theme
 * - Android hardware back button navigates inside the app instead of exiting
 * `onBack` should return true when the press was consumed.
 */
export async function initNative(onBack: () => boolean): Promise<void> {
  if (!isNativeApp()) return;
  (window as unknown as { __WS_NATIVE__?: boolean }).__WS_NATIVE__ = true;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setBackgroundColor({ color: "#0b1410" });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch { /* plugin unavailable */ }

  try {
    const { App } = await import("@capacitor/app");
    await App.removeAllListeners();
    App.addListener("backButton", () => {
      let handled = false;
      try {
        handled = onBack();
      } catch { /* ignore */ }
      if (!handled) {
        App.minimizeApp().catch(() => {});
      }
    });
  } catch { /* plugin unavailable */ }
}
