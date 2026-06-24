import { useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowRight, ArrowUpRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

const TAGS = ["AI TRY-ON", "300+ ATHLETES", "FW2016 DROP", "FREE RETURNS"];

export default function Login() {
  const [isSignupRoute] = useRoute("/signup");
  const [mode, setMode] = useState<"signin" | "signup">(isSignupRoute ? "signup" : "signin");
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const utils = trpc.useUtils();
  const signup = mode === "signup";

  const onAuthed = async () => {
    await utils.auth.me.invalidate();
    window.location.href = "/";
  };

  const login = trpc.auth.login.useMutation({
    onSuccess: onAuthed,
    onError: err => toast.error(err.message || "Sign in failed"),
  });
  const register = trpc.auth.register.useMutation({
    onSuccess: onAuthed,
    onError: err => toast.error(err.message || "Could not create account"),
  });
  const pending = login.isPending || register.isPending;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (signup) register.mutate({ name: form.name, email: form.email, password: form.password });
    else login.mutate({ email: form.email, password: form.password });
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-paper text-ink">
      {/* brand panel */}
      <div className="relative surface-dark p-8 lg:p-14 flex flex-col justify-between overflow-hidden">
        <Link href="/" className="flex items-center gap-2 relative z-10 w-fit">
          <span className="grid place-items-center w-9 h-9 bg-signal text-white display text-xl">H</span>
          <span className="display text-2xl">HEIS KITS</span>
        </Link>

        <div className="relative z-10">
          <span className="display absolute -top-24 -left-2 text-[14rem] leading-none text-white/5 select-none pointer-events-none hidden lg:block">
            {signup ? "JOIN" : "IN"}
          </span>
          <h1 className="display text-[clamp(2.6rem,6vw,5rem)] leading-[0.9]">
            For the<br /><span className="text-signal">love</span><br />of the game
          </h1>
          <p className="text-white/60 font-medium mt-5 max-w-sm">
            Sign in to unlock AI try-on, saved carts, faster checkout, and order tracking.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2">
          {TAGS.map(t => (
            <span key={t} className="text-[11px] font-bold uppercase tracking-widest border border-white/20 rounded-full px-3 py-1 text-white/70">{t}</span>
          ))}
        </div>
      </div>

      {/* form panel */}
      <div className="flex items-center justify-center p-8 lg:p-14">
        <div className="w-full max-w-sm">
          <span className="tech-label text-signal">{signup ? "New here" : "Welcome back"}</span>
          <h2 className="display text-4xl mb-1 mt-1">{signup ? "Create account" : "Sign in"}</h2>
          <p className="text-sm text-muted-foreground font-medium mb-8">
            {signup ? "Join HEIS KITS in seconds." : "Pick up where you left off."}
          </p>

          <form onSubmit={onSubmit} className="space-y-3">
            {signup && (
              <div>
                <label className="tech-label block mb-1.5">Full name</label>
                <input className="field" type="text" autoComplete="name" placeholder="Marcus Rashford" value={form.name} onChange={set("name")} required />
              </div>
            )}
            <div>
              <label className="tech-label block mb-1.5">Email</label>
              <input className="field" type="email" autoComplete="email" placeholder="you@email.com" value={form.email} onChange={set("email")} required />
            </div>
            <div>
              <label className="tech-label block mb-1.5">Password</label>
              <div className="relative">
                <input className="field pr-12" type={showPw ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} placeholder="••••••••" value={form.password} onChange={set("password")} minLength={signup ? 6 : undefined} required />
                <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink" aria-label="Toggle password">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {signup ? (
                <p className="tech-label mt-1.5">Min 6 characters</p>
              ) : (
                <div className="mt-1.5 text-right">
                  <Link href="/reset-password" className="tech-label hover:text-signal">Forgot password?</Link>
                </div>
              )}
            </div>
            <button type="submit" disabled={pending} className="btn btn-primary w-full !mt-5">
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
              {pending ? "Please wait…" : signup ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <span className="h-px flex-1 bg-border" />
            <span className="tech-label">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button onClick={() => (window.location.href = getLoginUrl())} className="btn btn-outline w-full">
            Continue with HEIS ID <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-sm text-muted-foreground font-medium mt-6 text-center">
            {signup ? "Already have an account? " : "New to HEIS KITS? "}
            <button
              onClick={() => setMode(signup ? "signin" : "signup")}
              className="font-bold text-ink hover:text-signal underline underline-offset-2"
            >
              {signup ? "Sign in" : "Create one"}
            </button>
          </p>

          <Link href="/" className="block text-center tech-label mt-8 hover:text-signal">← Back to shop</Link>
        </div>
      </div>
    </div>
  );
}
