import { useState } from "react";
import { Link } from "wouter";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { TechLabel } from "@/components/tech";

function Stars({ value, size = "w-4 h-4", onSelect }: { value: number; size?: string; onSelect?: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type={onSelect ? "button" : undefined}
          disabled={!onSelect}
          onClick={onSelect ? () => onSelect(n) : undefined}
          className={onSelect ? "cursor-pointer" : "cursor-default"}
          aria-label={`${n} star`}
        >
          <Star className={`${size} ${n <= value ? "fill-signal text-signal" : "text-ink/25"}`} />
        </button>
      ))}
    </div>
  );
}

export default function Reviews({ productId }: { productId: number }) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: reviews } = trpc.reviews.list.useQuery({ productId });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const create = trpc.reviews.create.useMutation({
    onSuccess: () => {
      utils.reviews.list.invalidate({ productId });
      setRating(0);
      setComment("");
      toast.success("Review posted");
    },
    onError: e => toast.error(e.message || "Could not post review"),
  });

  const list = reviews || [];
  const avg = list.length ? list.reduce((s: number, r: any) => s + r.rating, 0) / list.length : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) return toast.error("Pick a star rating");
    create.mutate({ productId, rating, comment: comment.trim() || undefined });
  };

  return (
    <section className="mt-12 border-t border-ink pt-10">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <TechLabel ink>Reviews</TechLabel>
          <div className="flex items-center gap-3 mt-2">
            <span className="display text-4xl">{avg ? avg.toFixed(1) : "—"}</span>
            <div>
              <Stars value={Math.round(avg)} />
              <span className="tech-label mt-1 block">{list.length} review{list.length === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* write a review */}
      {isAuthenticated ? (
        <form onSubmit={submit} className="border border-ink/15 p-5 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="tech-label">Your rating</span>
            <Stars value={rating} size="w-6 h-6" onSelect={setRating} />
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Share your thoughts on fit, quality, delivery…"
            rows={3}
            className="field resize-none"
          />
          <button type="submit" disabled={create.isPending} className="btn btn-primary mt-3">
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Post review
          </button>
        </form>
      ) : (
        <div className="border border-ink/15 p-5 mb-8 text-sm font-medium text-muted-foreground">
          <Link href="/login" className="font-bold text-ink hover:text-signal underline underline-offset-2">Sign in</Link> to write a review.
        </div>
      )}

      {/* list */}
      {list.length === 0 ? (
        <p className="text-muted-foreground font-medium">No reviews yet — be the first.</p>
      ) : (
        <div className="space-y-5">
          {list.map((r: any) => (
            <div key={r.id} className="border-b border-ink/10 pb-5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm">{r.author || "HEIS Member"}</span>
                <Stars value={r.rating} />
              </div>
              {r.comment && <p className="text-sm text-muted-foreground font-medium mt-2">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
