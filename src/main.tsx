import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register the offline Service Worker on the web build only
// (service workers don't exist inside the native Capacitor shell,
// where the fully-bundled offline data already covers everything).
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  import("./lib/native").then(({ isNativeApp }) => {
    if (isNativeApp()) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }).catch(() => {});
}
