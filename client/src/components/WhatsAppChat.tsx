import { useEffect, useState } from "react";
import { X, ArrowUpRight } from "lucide-react";

// Floating WhatsApp widget, mounted in Layout so it's on every storefront page.
// - Always-visible green button (bottom-right).
// - A teaser bubble pops up automatically shortly after the visitor lands
//   (once per browser session, dismissible).
// - Clicking the button opens a panel of preset quick messages; each one
//   opens a WhatsApp DM to the store with that message prefilled.
const PHONE = "2349017051121"; // +234 901 705 1121

const PRESETS = [
  "Hi HEIS KITS! I want to order a jersey \u{1F525}",
  "What sizes do you have available?",
  "How much is delivery to my location?",
  "I need help with my order",
  "Hi! I'm coming from heiskits.com \u{1F44B}",
];

const waLink = (msg: string) => `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;

function WhatsAppIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function WhatsAppChat() {
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);

  // Auto-show the teaser bubble shortly after entering the site (once per session).
  useEffect(() => {
    let hide: ReturnType<typeof setTimeout> | undefined;
    const show = setTimeout(() => {
      try {
        if (sessionStorage.getItem("heis_wa_teaser")) return;
        sessionStorage.setItem("heis_wa_teaser", "1");
      } catch {}
      setTeaser(true);
      hide = setTimeout(() => setTeaser(false), 15000); // auto-hide
    }, 2500);
    return () => { clearTimeout(show); if (hide) clearTimeout(hide); };
  }, []);

  const openPanel = () => { setOpen(o => !o); setTeaser(false); };

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3">
      {/* teaser bubble — pops up when the visitor lands */}
      {teaser && !open && (
        <div className="relative max-w-[290px] bg-card text-ink border-2 border-ink shadow-[6px_6px_0_rgba(10,10,11,0.18)] p-4 animate-in">
          <button
            onClick={() => setTeaser(false)}
            aria-label="Dismiss"
            className="absolute -top-3 -right-3 grid place-items-center w-7 h-7 rounded-full bg-ink text-white hover:bg-signal transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <p className="text-sm font-bold leading-snug">Hey! {"\u{1F44B}"} Welcome to HEIS KITS</p>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Need help picking a kit or checking your order? Chat with us on WhatsApp.
          </p>
          <button onClick={openPanel} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-[#1faa53] hover:text-signal">
            <WhatsAppIcon className="w-4 h-4" /> Chat with us <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* quick-message panel */}
      {open && (
        <div className="w-[310px] bg-card text-ink border-2 border-ink shadow-[6px_6px_0_rgba(10,10,11,0.18)] overflow-hidden">
          <div className="flex items-center gap-3 bg-[#25D366] text-white px-4 py-3">
            <span className="grid place-items-center w-9 h-9 rounded-full bg-white/20 shrink-0"><WhatsAppIcon className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <p className="font-bold leading-tight">HEIS KITS</p>
              <p className="text-[11px] font-medium text-white/85">Typically replies within minutes</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat panel" className="grid place-items-center w-8 h-8 hover:bg-white/15 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3">
            <p className="tech-label mb-2">Send us a quick message</p>
            <div className="space-y-1.5">
              {PRESETS.map(msg => (
                <a
                  key={msg}
                  href={waLink(msg)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-2 border border-ink/15 hover:border-[#25D366] hover:bg-[#25D366]/5 px-3 py-2.5 text-sm font-medium transition-colors"
                >
                  <span className="min-w-0 truncate">{msg}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-[#1faa53]" />
                </a>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground font-medium mt-2.5 text-center">Opens WhatsApp · +234 901 705 1121</p>
          </div>
        </div>
      )}

      {/* the floating button */}
      <button
        onClick={openPanel}
        aria-label="Chat with us on WhatsApp"
        title="Chat with us on WhatsApp"
        className="relative grid place-items-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(37,211,102,0.45)] hover:scale-105 active:scale-95 transition-transform"
      >
        {teaser && !open && <span aria-hidden className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-40" />}
        <WhatsAppIcon />
      </button>
    </div>
  );
}
