import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";
import ProfileDashboard from "@/components/ProfileDashboard";
import { TechLabel } from "@/components/tech";

export default function Profile() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: profile, isLoading } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const [retake, setRetake] = useState(false);
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ favoriteSport: "", favoriteTeam: "", userType: "", stylePreference: "" });

  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: async () => {
      toast.success("Profile saved");
      await utils.profile.get.invalidate();
      setRetake(false);
      setStep(0);
    },
    onError: error => toast.error(error.message || "Failed to update profile"),
  });

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <h2 className="display text-4xl mb-4">Sign in to build your profile</h2>
          <Link href="/login" className="btn btn-primary">Sign in</Link>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return <Layout><div className="container py-24 text-center tech-label">Loading your account…</div></Layout>;
  }

  // Show the Amazon-style dashboard once the personalization quiz is done.
  if (profile?.profileCompleted && !retake) {
    return <Layout><ProfileDashboard profile={profile} onRetake={() => { setRetake(true); setFormData({ favoriteSport: "", favoriteTeam: "", userType: "", stylePreference: "" }); }} /></Layout>;
  }

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await updateProfile.mutateAsync(formData);
    setIsSubmitting(false);
  };

  const Choice = ({ field, value }: { field: keyof typeof formData; value: string }) => {
    const active = formData[field] === value;
    return (
      <button
        onClick={() => setFormData({ ...formData, [field]: value })}
        className={`w-full p-4 border-2 text-left font-bold transition-colors ${active ? "border-signal bg-signal/10 text-ink" : "border-ink/15 hover:border-ink"}`}
      >
        {value}
      </button>
    );
  };

  return (
    <Layout>
      <div className="container py-12 max-w-xl">
        <div className="mb-10">
          <div className="flex gap-1.5 mb-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-1 flex-1 transition-colors ${i <= step ? "bg-signal" : "bg-ink/10"}`} />
            ))}
          </div>
          <TechLabel className="text-signal">Step {step + 1} of 4</TechLabel>
        </div>

        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h1 className="display text-4xl mb-2">Build your profile</h1>
              <p className="text-muted-foreground font-medium">A few quick questions to personalize your shop.</p>
            </div>
            <div>
              <h2 className="font-bold text-lg mb-4">Favorite sport?</h2>
              <div className="space-y-3">{["Football/Soccer", "Basketball", "Other"].map(v => <Choice key={v} field="favoriteSport" value={v} />)}</div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="display text-3xl">Favorite team?</h2>
            <input
              type="text"
              placeholder="Manchester United, Liverpool, PSG…"
              value={formData.favoriteTeam}
              onChange={e => setFormData({ ...formData, favoriteTeam: e.target.value })}
              className="field"
            />
            <p className="tech-label">Leave blank if you don't have one</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="display text-3xl">Fan or player?</h2>
            <div className="space-y-3">{["Fan", "Player", "Both"].map(v => <Choice key={v} field="userType" value={v} />)}</div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="display text-3xl">Your style?</h2>
            <div className="space-y-3">{["Classic", "Modern", "Bold", "Minimalist"].map(v => <Choice key={v} field="stylePreference" value={v} />)}</div>
          </div>
        )}

        <div className="flex gap-3 mt-10">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="btn btn-outline flex-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={step === 3 ? handleSubmit : () => setStep(step + 1)}
            disabled={(step === 0 && !formData.favoriteSport) || (step === 2 && !formData.userType) || (step === 3 && !formData.stylePreference) || isSubmitting}
            className="btn btn-primary flex-1"
          >
            {step === 3 ? (isSubmitting ? "Saving…" : "Finish") : "Next"} {step < 3 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </Layout>
  );
}
