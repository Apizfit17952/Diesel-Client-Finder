import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const createNoiseMatcher = () => {
  const patterns = [
    /A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received/i,
    /Could not establish connection\. Receiving end does not exist/i,
    /AbortError: The play\(\) request was interrupted by a call to pause\(\)/i,
  ];

  return (value: unknown): string | null => {
    const message =
      typeof value === "string"
        ? value
        : value && typeof value === "object" && "message" in value
          ? String((value as any).message)
          : value && typeof value === "object" && "reason" in value
            ? String((value as any).reason)
            : null;

    if (!message) return null;
    return patterns.some((p) => p.test(message)) ? message : null;
  };
};

const isNoisy = createNoiseMatcher();

window.addEventListener(
  "error",
  (event) => {
    const msg = isNoisy(event.error ?? event.message);
    if (!msg) return;
    console.warn("[suppressed]", msg);
    event.preventDefault();
    event.stopImmediatePropagation();
  },
  { capture: true }
);

window.addEventListener(
  "unhandledrejection",
  (event) => {
    const msg = isNoisy(event.reason);
    if (!msg) return;
    console.warn("[suppressed]", msg);
    event.preventDefault();
  },
  { capture: true }
);

createRoot(document.getElementById("root")!).render(<App />);
