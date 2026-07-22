import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("BudgetFlow service worker registration failed", error);
      });
    });
  } else {
    // Never let the service worker cache Vite development chunks. Stale chunks
    // can combine different React copies and cause an invalid-hook-call crash.
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => undefined);
    if ("caches" in window) {
      caches.keys()
        .then((keys) => Promise.all(keys.filter((key) => key.startsWith("budgetflow-")).map((key) => caches.delete(key))))
        .catch(() => undefined);
    }
  }
}
