import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowUpRight, ArrowRight, Sparkles, Search, MessageCircle, Ruler,
} from "lucide-react";
import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import MatchTicker from "@/components/MatchTicker";
import MatchCenter from "@/components/MatchCenter";
import Reveal from "@/components/Reveal";
import { ProductGridSkeleton } from "@/components/Skeleton";
import { TechLabel, Tag } from "@/components/tech";

const AI_MODULES = [
  { icon: Sparkles, code: "01", title: "Virtual Try-On", desc: "Upload a photo. See the kit on your body.", href: "/catalog", img: "/ai-tryon.png" },
  { icon: Search, code: "02", title: "Image Search", desc: "Snap any kit. We match the catalog.", href: "/search", img: "/ai-search.png" },
  { icon: Ruler, code: "03", title: "Size Advisor", desc: "Height + weight in. Perfect size out.", href: "/size-advisor", img: "/ai-size.png" },
  { icon: MessageCircle, code: "04", title: "Expert Chat", desc: "Football-savvy fit + culture help.", href: "/chat", img: "/ai-chat.png" },
];

export default function Home() {
  const { data: allProducts } = trpc.products.list.useQuery({ limit: 100 });
  // ~20 products spread across the catalog for the featured grid (≈5 rows × 4).
  const step = Math.max(1, Math.ceil((allProducts?.length || 20) / 20));
  const featured = (allProducts || []).filter((_: any, i: number) => i % step === 0).slice(0, 20);

  return (
    <Layout>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden border-b-2 border-ink grid-bg">
        <div className="container">
          <div className="grid lg:grid-cols-[1fr_1.15fr] gap-6 lg:gap-10 items-stretch min-h-[82vh] lg:min-h-[88vh]">
            {/* copy — slides in from the left and settles */}
            <div className="anim-slide-left relative z-10 flex flex-col justify-center py-10 lg:py-16">
              <div className="flex items-center gap-3 mb-5">
                <Tag variant="signal">New Drop — WC2026</Tag>
                <TechLabel className="hidden sm:block">Worldcup Collection</TechLabel>
              </div>
              <h1 className="display text-[clamp(2.8rem,6.5vw,6rem)] leading-[0.92]">
                For the <span className="text-signal">love</span><br />of the game
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mt-5 max-w-md font-medium">
                Premium football kits, training wear and gear — for fans and players who live the game.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-8">
                <Link href="/catalog" className="btn btn-primary">Shop the drop <ArrowRight className="w-4 h-4" /></Link>
                <Link href="/size-advisor" className="btn btn-outline">Find your size</Link>
              </div>
              <div className="flex items-center gap-6 sm:gap-10 mt-10">
                <Stat value="100+" label="Collections" />
                <span className="w-px h-10 bg-border" />
                <Stat value="300+" label="Athletes" />
                <span className="w-px h-10 bg-border" />
                <Stat value="4" label="AI tools" />
              </div>
            </div>

            {/* athlete cutout — slides in from the right and settles */}
            <div className="anim-slide-right relative flex items-end justify-center min-h-[52vh] lg:min-h-0">
              <div aria-hidden className="absolute left-1/2 bottom-[4%] -translate-x-1/2 w-full max-w-[860px] aspect-square rounded-full bg-signal/15 blur-[90px]" />
              <span aria-hidden className="display absolute inset-x-0 bottom-[3%] flex justify-center text-center leading-[0.72] text-[clamp(7rem,27vw,20rem)] text-ink/[0.09] select-none pointer-events-none">
                GEAR<br />UP
              </span>
              <img
                src="/hero-athlete-cut.png"
                alt="Athlete surrounded by HEIS KITS gear"
                className="relative z-10 w-full h-full object-contain object-bottom max-h-[58vh] lg:max-h-[80vh] drop-shadow-[0_25px_45px_rgba(0,0,0,0.18)]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============ SHOP FEATURES (AI modules) — right after the hero ============ */}
      <section className="surface-dark">
        <div className="container py-16 lg:py-24">
          <div className="flex items-center gap-3 mb-12">
            <Sparkles className="w-5 h-5 text-signal" />
            <span className="tech-label text-signal">AI-Powered Experience</span>
          </div>
          <div className="grid lg:grid-cols-2 gap-10 items-center mb-14">
            <h2 className="display text-[clamp(2.5rem,6vw,5.5rem)]">
              Smarter<br /><span className="text-signal">than</span> the<br />average shop
            </h2>
            <p className="text-white/70 text-lg font-medium max-w-md">
              Four AI tools that make finding your perfect kit effortless — from
              virtual try-on to natural-language search. Built in, not bolted on.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AI_MODULES.map((m, i) => (
              <Reveal key={m.code} delay={i * 70} className="h-full">
              <Link href={m.href} className="group bg-card text-ink overflow-hidden flex flex-col hover:-translate-y-1 transition-transform h-full">
                <div className="aspect-[5/4] bg-secondary overflow-hidden border-b border-ink/10">
                  <img src={m.img} alt={m.title} loading="lazy" className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2">
                    <m.icon className="w-5 h-5 text-signal" />
                    <h3 className="display text-xl">{m.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 flex-1 font-medium">{m.desc}</p>
                  <span className="tech-label text-signal inline-flex items-center gap-1 mt-3">Launch <ArrowUpRight className="w-3 h-3" /></span>
                </div>
              </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <MatchTicker />

      {/* ============ FEATURED — grid (no side-scroll), See more at the bottom ============ */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="mb-8">
            <TechLabel>The lineup</TechLabel>
            <h2 className="display text-[clamp(2.5rem,6vw,5rem)] mt-2">Featured Drops</h2>
          </div>
          {featured.length === 0 ? (
            <ProductGridSkeleton count={8} />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                {featured.map((p: any) => <ProductCard key={p.id} product={p} />)}
              </div>
              <div className="flex justify-center mt-10 lg:mt-12">
                <Link href="/catalog" className="btn btn-primary">See more <ArrowUpRight className="w-4 h-4" /></Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ============ MATCH CENTER ============ */}
      <MatchCenter />

      {/* ============ CTA — Gear Up ============ */}
      <section className="bg-signal text-white overflow-hidden">
        <div className="container pt-12 lg:pt-16">
          <div className="grid lg:grid-cols-2 gap-8 items-end">
            {/* text — above the image on mobile, left on desktop */}
            <div className="text-center lg:text-left pb-10 lg:pb-20">
              <TechLabel className="!text-white/70">Quality that withstands time &amp; temperature</TechLabel>
              <h2 className="display text-[clamp(2.8rem,9vw,6rem)] mt-3">Gear up.<br />Show out.</h2>
              <p className="text-white/80 font-medium mt-4 max-w-md mx-auto lg:mx-0">
                Two clubs. Full kits. Every accessory. Everything you need to look
                the part and play the part.
              </p>
              <div className="mt-7 flex justify-center lg:justify-start">
                <Link href="/catalog" className="btn btn-paper">Enter the shop <ArrowRight className="w-4 h-4" /></Link>
              </div>
            </div>
            {/* image — anchored to the base, enlarged */}
            <div className="relative flex items-end justify-center min-h-[58vh] lg:min-h-[74vh]">
              <span aria-hidden className="display absolute inset-x-0 bottom-[8%] flex justify-center text-white/10 text-[clamp(7rem,22vw,16rem)] leading-none select-none pointer-events-none">KIT</span>
              <img src="/gearup-cut.png" alt="Mannequins wearing club tracksuits with sports gear" className="relative z-10 w-full max-h-[58vh] lg:max-h-[76vh] object-contain object-bottom drop-shadow-[0_25px_45px_rgba(0,0,0,0.25)]" />
            </div>
          </div>
        </div>
      </section>

    </Layout>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="display text-3xl">{value}</div>
      <div className="tech-label mt-1">{label}</div>
    </div>
  );
}
