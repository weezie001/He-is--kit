import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Send, LifeBuoy, Loader2, Headphones } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Layout from "@/components/Layout";
import { TechLabel } from "@/components/tech";

export default function Support() {
  const { isAuthenticated, loading, user } = useAuth();
  const utils = trpc.useUtils();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = trpc.support.myThread.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const markRead = trpc.support.markMineRead.useMutation({
    // Refresh the thread too so messages come back with readByUser=true —
    // otherwise the "has unread" effect would re-fire on every poll.
    onSuccess: () => Promise.all([utils.support.myUnread.invalidate(), utils.support.myThread.invalidate()]),
  });

  const send = trpc.support.send.useMutation({
    onSuccess: async () => { setText(""); await utils.support.myThread.invalidate(); },
    onError: e => toast.error(e.message || "Could not send message"),
  });

  // Mark admin replies as read whenever the thread is open / updates.
  useEffect(() => {
    if (isAuthenticated && messages && messages.some((m: any) => m.sender === "admin" && !m.readByUser)) {
      markRead.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, messages]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (!loading && !isAuthenticated) {
    return (
      <Layout>
        <div className="container py-24 text-center max-w-md mx-auto">
          <LifeBuoy className="w-10 h-10 mx-auto text-signal mb-4" />
          <h2 className="display text-4xl mb-3">Customer support</h2>
          <p className="text-muted-foreground font-medium mb-6">Sign in to message our team — we'll reply right here.</p>
          <Link href="/login" className="btn btn-primary">Sign in</Link>
        </div>
      </Layout>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    send.mutate({ content: t });
  };

  const list = (messages as any[]) || [];

  return (
    <Layout footer={false}>
      <div className="container py-8 max-w-2xl">
        <Link href="/profile" className="tech-label hover:text-signal inline-flex items-center gap-1 mb-4">← Account</Link>
        <div className="flex items-center gap-3 mb-1">
          <span className="w-10 h-10 grid place-items-center bg-signal text-white shrink-0"><Headphones className="w-5 h-5" /></span>
          <div>
            <h1 className="display text-3xl leading-none">Customer Support</h1>
            <TechLabel className="mt-1 inline-block">Typically replies within a day</TechLabel>
          </div>
        </div>

        {/* conversation */}
        <div className="border border-ink/15 bg-card mt-6 flex flex-col h-[60vh]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="h-full grid place-items-center tech-label"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : list.length === 0 ? (
              <div className="h-full grid place-items-center text-center px-6">
                <div>
                  <LifeBuoy className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                  <p className="font-bold">How can we help, {user?.name?.split(" ")[0] || "there"}?</p>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Ask about orders, sizing, returns or anything else.</p>
                </div>
              </div>
            ) : (
              list.map((m: any) => <Bubble key={m.id} mine={m.sender === "user"} content={m.content} at={m.createdAt} />)
            )}
            <div ref={endRef} />
          </div>

          {/* composer */}
          <form onSubmit={onSubmit} className="border-t border-ink/15 p-3 flex items-center gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Type your message…"
              className="field !py-2.5"
              maxLength={2000}
            />
            <button type="submit" disabled={send.isPending || !text.trim()} className="btn btn-primary !py-2.5 !px-4 shrink-0">
              {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}

function Bubble({ mine, content, at }: { mine: boolean; content: string; at: string | Date }) {
  const time = new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] px-3.5 py-2.5 text-sm ${mine ? "bg-signal text-white" : "bg-secondary text-ink"}`}>
        {!mine && <div className="tech-label !text-[10px] mb-1 opacity-70">HEIS Support</div>}
        <p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>
        <div className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-muted-foreground"}`}>{time}</div>
      </div>
    </div>
  );
}
