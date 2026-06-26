import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowRight, Ruler } from "lucide-react";
import Layout from "@/components/Layout";
import Pagination from "@/components/Pagination";
import { BODY_TYPES, Gender, BodyType } from "@/lib/bodyTypes";
import { TechLabel } from "@/components/tech";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

function fitNote(bias: number) {
  if (bias < 0) return "Lean build — true to size for a fitted look, or size up for relaxed.";
  if (bias === 0) return "True to size for your build.";
  if (bias === 1) return "Athletic / broad build — true to size; size up for extra room.";
  return "Fuller build — we've sized up for comfort.";
}

export default function SizeAdvisor() {
  const utils = trpc.useUtils();
  const [gender, setGender] = useState<Gender>("male");
  const [bodyType, setBodyType] = useState<BodyType | null>(null);
  const [heightUnit, setHeightUnit] = useState<"cm" | "ftin">("cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [cm, setCm] = useState("");
  const [ft, setFt] = useState("");
  const [inch, setInch] = useState("");
  const [kg, setKg] = useState("");
  const [lb, setLb] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [typePage, setTypePage] = useState(0);

  const heightCm = heightUnit === "cm" ? Number(cm) : (Number(ft) * 12 + Number(inch || 0)) * 2.54;
  const weightKg = weightUnit === "kg" ? Number(kg) : Number(lb) * 0.453592;

  const types = BODY_TYPES[gender];
  const TYPES_PER = 10;
  const typePages = Math.ceil(types.length / TYPES_PER);
  const shownTypes = types.slice(typePage * TYPES_PER, typePage * TYPES_PER + TYPES_PER);

  const getRecommendation = async () => {
    if (!heightCm || !weightKg) return toast.error("Enter your height and weight");
    setLoading(true);
    try {
      const base = await utils.sizeAdvisor.recommend.fetch({
        height: Math.round(heightCm),
        weight: Math.round(weightKg),
      });
      const bias = bodyType?.bias ?? 0;
      const idx = Math.min(SIZES.length - 1, Math.max(0, SIZES.indexOf(base.size) + bias));
      setResult({ size: SIZES[idx], baseSize: base.size, confidence: base.confidence, bias });
    } catch (e: any) {
      toast.error(e.message || "Failed to get recommendation");
    }
    setLoading(false);
  };

  const Toggle = ({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: any) => void }) => (
    <div className="inline-flex border border-ink/20">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${value === v ? "surface-dark" : "hover:bg-secondary"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <Layout>
      <section className="border-b border-ink">
        <div className="container py-12">
          <div className="flex items-center gap-2 mb-2"><Ruler className="w-4 h-4 text-signal" /><TechLabel ink>AI Size Advisor</TechLabel></div>
          <h1 className="display text-[clamp(2.6rem,7vw,6rem)]">Find your fit</h1>
          <p className="text-sm text-muted-foreground font-medium mt-2">Pick your body type, add your measurements, get your perfect size.</p>
        </div>
      </section>

      <div className="container py-12 grid lg:grid-cols-3 gap-10">
        {/* left: body type picker */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <TechLabel ink>1 · Choose your body type</TechLabel>
            <Toggle options={[["male", "Male"], ["female", "Female"]]} value={gender} onChange={(g: Gender) => { setGender(g); setBodyType(null); setTypePage(0); }} />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {shownTypes.map(t => {
              const active = bodyType?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setBodyType(t)}
                  className={`border-2 flex flex-col items-center transition-colors overflow-hidden ${active ? "border-signal" : "border-ink/15 hover:border-ink"}`}
                >
                  <div className="aspect-square w-full bg-black overflow-hidden">
                    <img src={t.img} alt={t.label} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                  <span className={`text-[11px] font-bold uppercase tracking-wide py-1.5 px-1 text-center leading-tight ${active ? "bg-signal text-white w-full" : ""}`}>{t.label}</span>
                </button>
              );
            })}
          </div>
          <Pagination page={typePage} pages={typePages} onPage={setTypePage} />
        </div>

        {/* right: measurements + result */}
        <div>
          <TechLabel ink>2 · Your measurements</TechLabel>
          <div className="space-y-5 mt-4">
            {/* height */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="tech-label">Height</label>
                <Toggle options={[["cm", "cm"], ["ftin", "ft/in"]]} value={heightUnit} onChange={setHeightUnit} />
              </div>
              {heightUnit === "cm" ? (
                <input type="number" value={cm} onChange={e => setCm(e.target.value)} placeholder="180" className="field" />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative"><input type="number" value={ft} onChange={e => setFt(e.target.value)} placeholder="5" className="field !pr-8" /><span className="absolute right-3 top-1/2 -translate-y-1/2 tech-label">ft</span></div>
                  <div className="relative"><input type="number" value={inch} onChange={e => setInch(e.target.value)} placeholder="11" className="field !pr-8" /><span className="absolute right-3 top-1/2 -translate-y-1/2 tech-label">in</span></div>
                </div>
              )}
            </div>
            {/* weight */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="tech-label">Weight</label>
                <Toggle options={[["kg", "kg"], ["lb", "lb"]]} value={weightUnit} onChange={setWeightUnit} />
              </div>
              {weightUnit === "kg" ? (
                <input type="number" value={kg} onChange={e => setKg(e.target.value)} placeholder="75" className="field" />
              ) : (
                <input type="number" value={lb} onChange={e => setLb(e.target.value)} placeholder="165" className="field" />
              )}
            </div>

            <button onClick={getRecommendation} disabled={loading} className="btn btn-signal w-full">
              {loading ? "Analyzing…" : "Get my size"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* result */}
          {result && (
            <div className="surface-dark p-6 mt-6">
              <TechLabel className="!text-white/60">Recommended size</TechLabel>
              <div className="flex items-center gap-4 mt-2">
                <span className="display text-7xl text-signal leading-none">{result.size}</span>
                {bodyType && (
                  <div className="w-24 h-24 overflow-hidden bg-black shrink-0">
                    <img src={bodyType.img} alt={bodyType.label} className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div className="mt-4">
                <div className="flex justify-between tech-label !text-white/60 mb-1"><span>Confidence</span><span>{result.confidence}%</span></div>
                <div className="w-full bg-card/15 h-2"><div className="bg-signal h-full" style={{ width: `${result.confidence}%` }} /></div>
              </div>
              <p className="text-sm text-white/70 font-medium mt-4">{fitNote(result.bias)}</p>
              <Link href={`/catalog`} className="btn btn-paper w-full mt-5">Shop your size <ArrowRight className="w-4 h-4" /></Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
