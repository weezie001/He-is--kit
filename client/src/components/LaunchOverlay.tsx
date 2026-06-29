import { useEffect, useState } from "react";
import { LAUNCH_AT_MS } from "@shared/const";
import { Clock, Bell, CalendarPlus, X } from "lucide-react";

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const EVENT = {
  title: "HEIS KITS Launch — Free Mystery Gift 🎁",
  details: "Shop the launch at https://heiskits.com — first 3 buyers get a free mystery gift.",
  url: "https://heiskits.com",
};

function googleCalUrl() {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: EVENT.title,
    dates: `${stamp(LAUNCH_AT_MS)}/${stamp(LAUNCH_AT_MS + 3600000)}`,
    details: EVENT.details,
    location: EVENT.url,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

function icsHref() {
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HEIS KITS//Launch//EN", "BEGIN:VEVENT",
    `UID:heiskits-launch-${LAUNCH_AT_MS}@heiskits.com`,
    `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(LAUNCH_AT_MS)}`, `DTEND:${stamp(LAUNCH_AT_MS + 3600000)}`,
    `SUMMARY:${EVENT.title}`, `DESCRIPTION:${EVENT.details}`, `URL:${EVENT.url}`,
    "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", "DESCRIPTION:HEIS KITS launches in 10 minutes", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
}

export default function LaunchOverlay() {
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem("launch_dismissed") === "1"; } catch { return false; }
  });

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = LAUNCH_AT_MS - now;
  if (remaining <= 0 || dismissed) return null; // only before launch, and dismissable

  const dismiss = () => { try { sessionStorage.setItem("launch_dismissed", "1"); } catch {} setDismissed(true); };

  const sec = Math.floor(remaining / 1000);
  const parts: [string, number][] = [["Hrs", Math.floor(sec / 3600)], ["Min", Math.floor((sec % 3600) / 60)], ["Sec", sec % 60]];

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm grid place-items-start sm:place-items-center p-4 overflow-y-auto">
      <div className="relative bg-paper border-2 border-ink max-w-md w-full my-6 shadow-[8px_8px_0_rgba(0,0,0,0.3)]">
        <button onClick={dismiss} aria-label="Close" className="absolute top-3 right-3 z-10 grid place-items-center w-9 h-9 bg-ink/70 hover:bg-ink text-white rounded-full transition-colors">
          <X className="w-4 h-4" />
        </button>
        <img
          src="/launch-poster.png"
          alt="HEIS KITS launch — tonight 8 PM"
          className="w-full block"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
        <div className="p-5">
          <div className="flex items-center justify-center gap-2 tech-label text-signal mb-2"><Clock className="w-4 h-4" /> Launching in</div>
          <div className="flex items-center justify-center gap-3 mb-5">
            {parts.map(([lbl, val]) => (
              <div key={lbl} className="text-center">
                <div className="display text-4xl tabular-nums bg-ink text-paper w-16 py-2">{pad(val)}</div>
                <div className="tech-label mt-1">{lbl}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <a href={googleCalUrl()} target="_blank" rel="noreferrer" className="btn btn-outline !py-2.5 !text-xs"><Bell className="w-4 h-4" /> Google reminder</a>
            <a href={icsHref()} download="heiskits-launch.ics" className="btn btn-outline !py-2.5 !text-xs"><CalendarPlus className="w-4 h-4" /> Add to calendar</a>
          </div>
          <button onClick={dismiss} className="btn btn-primary w-full">Browse the site</button>
          <p className="tech-label text-center mt-3 normal-case tracking-normal">New accounts open at 8 PM · first 3 buyers get a free gift 🎁</p>
        </div>
      </div>
    </div>
  );
}
