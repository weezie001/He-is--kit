import { useState } from "react";
import { Link } from "wouter";
import { User, MapPin, Palette, Bell, Lock, LogOut, Moon, Sun, Trash2, Loader2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import Layout from "@/components/Layout";
import { TechLabel } from "@/components/tech";

type Tab = "profile" | "address" | "appearance" | "notifications" | "security" | "account";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "address", label: "Address", icon: MapPin },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Password", icon: Lock },
  { id: "account", label: "Sign out", icon: LogOut },
];

export default function Settings() {
  const { user, refresh, logout, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState<Tab>("profile");

  const addr = (user?.shippingAddress as any) || {};
  const [form, setForm] = useState({
    name: user?.name || "", phone: user?.phone || "",
    address: addr.address || "", city: addr.city || "", country: addr.country || "", postalCode: addr.postalCode || "",
  });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = trpc.profile.updateAccount.useMutation({
    onSuccess: async () => { await Promise.all([utils.auth.me.invalidate(), refresh()]); toast.success("Saved"); },
    onError: e => toast.error(e.message || "Could not save"),
  });
  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => { setPw({ currentPassword: "", newPassword: "" }); toast.success("Password updated"); },
    onError: e => toast.error(e.message || "Could not change password"),
  });
  const deleteAccount = trpc.auth.deleteAccount.useMutation({
    onSuccess: () => { toast.success("Account deleted"); window.location.href = "/"; },
    onError: e => toast.error(e.message || "Could not delete account"),
  });

  if (!loading && !isAuthenticated) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <h2 className="display text-4xl mb-4">Sign in to manage settings</h2>
          <Link href="/login" className="btn btn-primary">Sign in</Link>
        </div>
      </Layout>
    );
  }

  const canChangePassword = user?.loginMethod === "email";

  return (
    <Layout>
      <div className="container py-10">
        <Link href="/profile" className="inline-flex items-center gap-1 tech-label hover:text-signal mb-4"><ChevronLeft className="w-4 h-4" /> Back to account</Link>
        <h1 className="display text-[clamp(2.4rem,6vw,4.5rem)] mb-8">Settings</h1>

        <div className="grid lg:grid-cols-[220px_1fr] gap-8">
          {/* sub-page nav */}
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible border-b lg:border-b-0 lg:border-r border-ink/10 lg:pr-4 pb-2 lg:pb-0">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2.5 px-4 py-2.5 text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${tab === t.id ? "bg-ink text-paper" : "hover:text-signal"}`}
              >
                <t.icon className="w-4 h-4 shrink-0" /> {t.label}
              </button>
            ))}
          </nav>

          {/* sub-page content */}
          <div className="max-w-xl">
            {tab === "profile" && (
              <Section title="Profile">
                <form onSubmit={e => { e.preventDefault(); save.mutate({ name: form.name, phone: form.phone }); }} className="space-y-3">
                  <Field label="Full name"><input className="field" value={form.name} onChange={set("name")} /></Field>
                  <Field label="Email"><input className="field opacity-60" value={user?.email || ""} disabled /></Field>
                  <Field label="Phone"><input className="field" value={form.phone} onChange={set("phone")} placeholder="+234…" /></Field>
                  <button type="submit" disabled={save.isPending} className="btn btn-primary">{save.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save</button>
                </form>
              </Section>
            )}

            {tab === "address" && (
              <Section title="Shipping address">
                <form onSubmit={e => { e.preventDefault(); save.mutate({ shippingAddress: { address: form.address, city: form.city, country: form.country, postalCode: form.postalCode } }); }} className="space-y-3">
                  <Field label="Address"><input className="field" value={form.address} onChange={set("address")} /></Field>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Field label="City"><input className="field" value={form.city} onChange={set("city")} /></Field>
                    <Field label="Country"><input className="field" value={form.country} onChange={set("country")} /></Field>
                    <Field label="Postal"><input className="field" value={form.postalCode} onChange={set("postalCode")} /></Field>
                  </div>
                  <button type="submit" disabled={save.isPending} className="btn btn-primary">{save.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save</button>
                </form>
              </Section>
            )}

            {tab === "appearance" && (
              <Section title="Appearance">
                <div className="flex items-center justify-between border border-ink/15 p-5">
                  <div><p className="font-bold">Theme</p><p className="tech-label mt-1">{theme === "dark" ? "Dark" : "Light"} mode</p></div>
                  <button onClick={toggleTheme} className="btn btn-outline">
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {theme === "dark" ? "Light" : "Dark"}
                  </button>
                </div>
              </Section>
            )}

            {tab === "notifications" && (
              <Section title="Notifications">
                <label className="flex items-center justify-between border border-ink/15 p-5 cursor-pointer">
                  <span><span className="font-bold block">Marketing emails</span><span className="tech-label mt-1 block">Drops, offers & news</span></span>
                  <input type="checkbox" defaultChecked={user?.marketingOptIn !== false} onChange={e => save.mutate({ marketingOptIn: e.target.checked })} className="w-5 h-5 accent-[var(--signal)]" />
                </label>
              </Section>
            )}

            {tab === "security" && (
              <Section title="Password">
                {canChangePassword ? (
                  <form onSubmit={e => { e.preventDefault(); changePassword.mutate(pw); }} className="space-y-3">
                    <Field label="Current password"><input className="field" type="password" value={pw.currentPassword} onChange={e => setPw(p => ({ ...p, currentPassword: e.target.value }))} required /></Field>
                    <Field label="New password"><input className="field" type="password" value={pw.newPassword} onChange={e => setPw(p => ({ ...p, newPassword: e.target.value }))} minLength={6} required /></Field>
                    <button type="submit" disabled={changePassword.isPending} className="btn btn-primary">{changePassword.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Update password</button>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground font-medium">You signed in with a social account — there's no password to change here.</p>
                )}
              </Section>
            )}

            {tab === "account" && (
              <Section title="Sign out">
                <button onClick={() => logout()} className="btn btn-primary"><LogOut className="w-4 h-4" /> Sign out</button>

                <div className="mt-10 border-t border-ink/15 pt-6">
                  <TechLabel className="text-destructive">Danger zone</TechLabel>
                  <p className="text-sm text-muted-foreground font-medium mt-2 mb-4">Permanently delete your account, orders and saved data. This can't be undone.</p>
                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-2 border-2 border-destructive text-destructive px-4 py-2 font-bold uppercase text-sm tracking-wide hover:bg-destructive hover:text-white transition-colors">
                      <Trash2 className="w-4 h-4" /> Delete account
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => deleteAccount.mutate()} disabled={deleteAccount.isPending} className="inline-flex items-center gap-2 bg-destructive text-white px-4 py-2 font-bold uppercase text-sm tracking-wide">
                        {deleteAccount.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Yes, delete permanently
                      </button>
                      <button onClick={() => setConfirmDelete(false)} className="btn btn-outline !py-2">Cancel</button>
                    </div>
                  )}
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="display text-3xl mb-5">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="tech-label block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
