// HEIS KITS — technical/brutalist UI primitives.
// Small, composable pieces that give the editorial "spec sheet" look.
import { ReactNode } from "react";

/** Numbered marker rendered as <100>. */
export function Marker({ value, className = "" }: { value: string | number; className?: string }) {
  return <span className={`marker ${className}`}>{value}</span>;
}

/** Uppercase monospace technical label. */
export function TechLabel({ children, ink = false, className = "" }: { children: ReactNode; ink?: boolean; className?: string }) {
  return <span className={`tech-label ${ink ? "tech-label--ink" : ""} ${className}`}>{children}</span>;
}

/** Decorative CSS barcode. */
export function Barcode({ code = "HK-0000", className = "" }: { code?: string; className?: string }) {
  return (
    <div className={className}>
      <div className="barcode" aria-hidden />
      <div className="tech-label mt-1">{code}</div>
    </div>
  );
}

/** Tag chip. variant: outline | ink | signal */
export function Tag({ children, variant = "outline", className = "" }: { children: ReactNode; variant?: "outline" | "ink" | "signal"; className?: string }) {
  const v = variant === "ink" ? "tag--ink" : variant === "signal" ? "tag--signal" : "";
  return <span className={`tag ${v} ${className}`}>{children}</span>;
}

/** Section header: marker index + label + rule line. */
export function SectionLabel({ index, children, className = "" }: { index?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {index && <Marker value={index} />}
      <TechLabel ink>{children}</TechLabel>
      <span className="hairline--soft flex-1" style={{ height: 1 }} />
    </div>
  );
}

/** Bordered frame with corner ticks. */
export function CornerFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`tech-frame corner-ticks ${className}`}>{children}</div>
  );
}

/** Small annotation block: label + value lines, monospace. */
export function Annotation({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <div className="tech-label">{label}</div>
      <div className="mono text-sm mt-1">{value}</div>
    </div>
  );
}
