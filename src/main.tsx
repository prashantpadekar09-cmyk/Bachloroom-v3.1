import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const RELOAD_GUARD_KEY = "bachloroom:chunk-reload-attempted";

const reloadOnce = () => {
  if (sessionStorage.getItem(RELOAD_GUARD_KEY) === "1") return;
  sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
  window.location.reload();
};

window.addEventListener("load", () => {
  sessionStorage.removeItem(RELOAD_GUARD_KEY);
});

// Handles Vite preload failures after a fresh deploy where old chunks are gone.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  reloadOnce();
});

// Fallback for generic dynamic import chunk errors across browsers.
window.addEventListener("error", (event) => {
  const message = event?.message?.toLowerCase?.() || "";
  if (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("loading chunk") ||
    message.includes("chunkloaderror")
  ) {
    reloadOnce();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
