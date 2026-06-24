import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Cookie, X } from "lucide-react";

const KEY = "heis-cookie-consent"; // "accepted" | "declined"

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch { /* storage blocked */ }
  }, []);

  const decide = (choice: "accepted" | "declined") => {
    try { localStorage.setItem(KEY, choice); } catch { /* ignore */ }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-4" role="dialog" aria-label="Cookie consent" aria-live="polite">
      <div className="container">
        <div className="surface-dark border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.35)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <Cookie className="w-6 h-6 text-signal shrink-0 hidden sm:block" />
          <p className="text-sm text-white/80 font-medium flex-1">
            We use essential cookies to run the store and optional analytics cookies to improve it. See our{" "}
            <Link href="/privacy" className="text-signal underline underline-offset-2">Privacy Policy</Link>.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => decide("declined")} className="px-4 py-2 text-[13px] font-bold uppercase tracking-wide text-white/70 hover:text-white transition-colors">
              Decline
            </button>
            <button onClick={() => decide("accepted")} className="btn btn-signal !py-2.5">Accept</button>
          </div>
          <button onClick={() => decide("declined")} aria-label="Dismiss" className="sm:hidden absolute top-3 right-3 text-white/50"><X className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
