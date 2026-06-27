import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Ruler, ChevronDown } from "lucide-react";
import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import { trpc } from "@/lib/trpc";
import { BODY_TYPES, Gender, BodyType } from "@/lib/bodyTypes";
import { TechLabel } from "@/components/tech";

// Body / garment measurements (inches) each size is cut to fit.
const SIZE_CHART = [
  { size: "XS", chest: [32, 34], shoulder: 17, length: 27 },
  { size: "S", chest: [35, 37], shoulder: 17.5, length: 28 },
  { size: "M", chest: [38, 40], shoulder: 18.5, length: 29.5 },
  { size: "L", chest: [41, 43], shoulder: 20, length: 31 },
  { size: "XL", chest: [44, 46], shoulder: 22, length: 33 },
  { size: "XXL", chest: [47, 50], shoulder: 24, length: 35 },
] as const;

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// Match primarily on chest, refined by shoulder/length, then shift by body-type bias.
function recommend(chest: number, shoulder: number, length: number, bias: number) {
  let idx = 0, bestScore = Infinity;
  SIZE_CHART.forEach((r, i) => {
    const cMid = (r.chest[0] + r.chest[1]) / 2;
    let s = Math.abs(cMid - chest) * 2;
    if (shoulder) s += Math.abs(r.shoulder - shoulder);
    if (length) s += Math.abs(r.length - length) * 0.5;
    if (s < bestScore) { bestScore = s; idx = i; }
  });
  idx = Math.min(SIZE_CHART.length - 1, Math.max(0, idx + bias));
  return SIZE_CHART[idx].size;
}

export default function SizeAdvisor() {
  const { data: catalog } = trpc.products.list.useQuery({ limit: 12 });
  const [gender, setGender] = useState<Gender>("male");
  const [bodyType, setBodyType] = useState<BodyType | null>(null);
  const [chest, setChest] = useState("");
  const [shoulder, setShoulder] = useState("");
  const [length, setLength] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [chartOpen, setChartOpen] = useState(false);

  const types = BODY_TYPES[gender];
  const measurements: { label: string; val: string; set: (v: string) => void; opts: number[] }[] = [
    { label: "Chest / Bust", val: chest, set: setChest, opts: range(30, 52) },
    { label: "Shoulder", val: shoulder, set: setShoulder, opts: range(15, 26) },
    { label: "Length", val: length, set: setLength, opts: range(25, 38) },
  ];

  const getSize = () => { if (chest) setResult(recommend(Number(chest), Number(shoulder || 0), Number(length || 0), bodyType?.bias ?? 0)); };

  return (
    <Layout>
      <section className="border-b border-ink">
        <div className="container py-12">
          <div className="flex items-center gap-2 mb-2"><Ruler className="w-4 h-4 text-signal" /><TechLabel ink>Size Advisor</TechLabel></div>
          <h1 className="display text-[clamp(2.6rem,7vw,6rem)]">Find your fit</h1>
          <p className="text-sm text-muted-foreground font-medium mt-2">Pick your build, select your measurements, and get your perfect size.</p>
        </div>
      </section>

      <div className="container py-12 grid lg:grid-cols-3 gap-10">
        {/* left: body type picker */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <TechLabel ink>1 · Choose your body type</TechLabel>
            <div className="inline-flex border border-ink/20">
              {(["male", "female"] as Gender[]).map(g => (
                <button key={g} type="button" onClick={() => { setGender(g); setBodyType(null); }}
                  className={`px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${gender === g ? "surface-dark" : "hover:bg-secondary"}`}>{g}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {types.map((t, i) => {
              const active = bodyType?.id === t.id;
              return (
                <button key={t.id} type="button" onClick={() => setBodyType(t)}
                  className={`border-2 flex flex-col items-center transition-colors overflow-hidden ${active ? "border-signal" : "border-ink/15 hover:border-ink"}`}>
                  {/* the first five renders have a black header bar + white line baked in — crop it off */}
                  <div className="aspect-square w-full bg-black overflow-hidden"><img src={t.img} alt={t.label} loading="lazy" className={`w-full h-full object-cover ${i < 5 ? "scale-125 origin-bottom" : ""}`} /></div>
                  <span className={`text-[11px] font-bold uppercase tracking-wide py-1.5 px-1 text-center leading-tight ${active ? "bg-signal text-white w-full" : ""}`}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* right: measurements + result */}
        <div>
          <TechLabel ink>2 · Select your measurements (inches)</TechLabel>
          <div className="space-y-4 mt-4">
            {measurements.map(m => (
              <label key={m.label} className="block">
                <span className="tech-label">{m.label}</span>
                <select value={m.val} onChange={e => m.set(e.target.value)} className="field mt-1.5">
                  <option value="">Select…</option>
                  {m.opts.map(n => <option key={n} value={n}>{n}&quot;</option>)}
                </select>
              </label>
            ))}
            <button onClick={getSize} disabled={!chest} className="btn btn-signal w-full disabled:opacity-50 disabled:pointer-events-none">Get my size <ArrowRight className="w-4 h-4" /></button>
          </div>

          {result && (
            <div className="surface-dark p-6 mt-6">
              <TechLabel className="!text-white/60">Recommended size</TechLabel>
              <div className="flex items-center gap-4 mt-2">
                <span className="display text-7xl text-signal leading-none">{result}</span>
                {bodyType && <div className="w-20 h-20 overflow-hidden bg-black shrink-0"><img src={bodyType.img} alt={bodyType.label} className="w-full h-full object-cover" /></div>}
              </div>
              <p className="text-sm text-white/70 font-medium mt-3">Based on your build and measurements. Between sizes? Size up for a relaxed fit.</p>
              <Link href="/catalog" className="btn btn-paper w-full mt-5">Shop your size <ArrowRight className="w-4 h-4" /></Link>
            </div>
          )}
        </div>
      </div>

      {/* size chart — click to open */}
      <div className="container pb-12">
        <button onClick={() => setChartOpen(o => !o)} aria-expanded={chartOpen}
          className="w-full flex items-center justify-between gap-3 border border-ink px-5 py-3.5 font-bold uppercase tracking-wide text-sm hover:bg-secondary transition-colors">
          <span className="inline-flex items-center gap-2"><Ruler className="w-4 h-4 text-signal" /> Size chart · body measurements (inches)</span>
          <ChevronDown className={`w-5 h-5 transition-transform ${chartOpen ? "rotate-180" : ""}`} />
        </button>
        {chartOpen && (
          <div className="border border-t-0 border-ink overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead><tr className="surface-dark tech-label !text-white/70">
                <th className="text-left py-2.5 px-3 font-bold">Size</th>
                <th className="text-right py-2.5 px-2 font-bold">Chest / Bust</th>
                <th className="text-right py-2.5 px-2 font-bold">Shoulder</th>
                <th className="text-right py-2.5 px-3 font-bold">Length</th>
              </tr></thead>
              <tbody>
                {SIZE_CHART.map(r => (
                  <tr key={r.size} className={`border-t border-ink/10 ${result === r.size ? "bg-signal/10 font-bold" : ""}`}>
                    <td className="py-2.5 px-3 font-bold">{r.size}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{r.chest[0]}–{r.chest[1]}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">{r.shoulder}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{r.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Catalog — shop straight from the size advisor */}
      {(catalog as any[] | undefined)?.length ? (
        <section className="container pb-16">
          <div className="flex items-end justify-between gap-3 mb-6 border-t border-ink/10 pt-10">
            <div>
              <TechLabel>Now shop</TechLabel>
              <h2 className="display text-[clamp(2rem,5vw,3.5rem)] mt-1">{result ? <>Kits in your size <span className="text-signal">{result}</span></> : "Shop the catalog"}</h2>
            </div>
            <Link href="/catalog" className="btn btn-outline hidden sm:inline-flex">All products <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {(catalog as any[]).slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      ) : null}
    </Layout>
  );
}
