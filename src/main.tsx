import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

/**
 * Register the service worker after load so it never competes with the first
 * paint. Dev is skipped deliberately: a cached shell in front of Vite's HMR
 * makes changes appear not to take effect.
 */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      // Not fatal — the app works fine without offline support.
      console.error("Service worker registration failed:", error);
    });
  });
}
