import { useState } from "react";
import { Link, useSearch } from "wouter";
import { ArrowUpRight, Eye, EyeOff, Loader2, MailCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import Layout from "@/components/Layout";
import { TechLabel } from "@/components/tech";

export default function ResetPassword() {
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);

  const request = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => setSent(true),
    onError: () => setSent(true), // never reveal whether the email exists
  });
  const reset = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setDone(true),
    onError: e => toast.error(e.message || "Could not reset password"),
  });

  return (
    <Layout footer={false}>
      <div className="container py-20 max-w-sm">
        <TechLabel className="text-signal">{token ? "Set a new password" : "Account recovery"}</TechLabel>
        <h1 className="display text-4xl mt-1 mb-6">{token ? "Reset password" : "Forgot password"}</h1>

        {/* --- reset form (has token) --- */}
        {token ? (
          done ? (
            <Result icon={<CheckCircle2 className="w-10 h-10 text-signal" />} title="Password updated" body="You can now sign in with your new password.">
              <Link href="/login" className="btn btn-primary">Sign in <ArrowUpRight className="w-4 h-4" /></Link>
            </Result>
          ) : (
            <form onSubmit={e => { e.preventDefault(); reset.mutate({ token, password }); }} className="space-y-3">
              <div>
                <label className="tech-label block mb-1.5">New password</label>
                <div className="relative">
                  <input className="field pr-12" type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} minLength={6} required autoComplete="new-password" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink" aria-label="Toggle password">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="tech-label mt-1.5">Min 6 characters</p>
              </div>
              <button type="submit" disabled={reset.isPending} className="btn btn-primary w-full">
                {reset.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />} Update password
              </button>
            </form>
          )
        ) : sent ? (
          <Result icon={<MailCheck className="w-10 h-10 text-signal" />} title="Check your inbox" body="If an account exists for that email, we've sent a link to reset your password. The link expires in 1 hour.">
            <Link href="/login" className="btn btn-outline">Back to sign in</Link>
          </Result>
        ) : (
          /* --- request form (no token) --- */
          <form onSubmit={e => { e.preventDefault(); request.mutate({ email: email.trim() }); }} className="space-y-3">
            <p className="text-sm text-muted-foreground font-medium mb-2">Enter your email and we'll send you a reset link.</p>
            <div>
              <label className="tech-label block mb-1.5">Email</label>
              <input className="field" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="you@email.com" />
            </div>
            <button type="submit" disabled={request.isPending} className="btn btn-primary w-full">
              {request.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />} Send reset link
            </button>
            <Link href="/login" className="block text-center tech-label mt-4 hover:text-signal">← Back to sign in</Link>
          </form>
        )}
      </div>
    </Layout>
  );
}

function Result({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="text-center border border-ink/15 p-8">
      <div className="mx-auto mb-4 w-fit">{icon}</div>
      <h2 className="display text-2xl mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground font-medium mb-6">{body}</p>
      {children}
    </div>
  );
}
