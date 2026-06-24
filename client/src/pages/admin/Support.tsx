import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Loader2, MessageSquare, ChevronLeft, Inbox } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AdminLayout from "@/components/AdminLayout";

export default function AdminSupport() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: threads, isLoading } = trpc.support.threads.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 5000,
  });

  const { data: messages } = trpc.support.thread.useQuery(
    { userId: selected ?? 0 },
    { enabled: isAdmin && selected != null, refetchInterval: 5000 },
  );

  // Opening a thread marks its user messages read on the server — refresh the
  // list badges once on select (the threads query also polls every 5s).
  useEffect(() => { if (selected != null) utils.support.threads.invalidate(); /* eslint-disable-next-line */ }, [selected]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const reply = trpc.support.reply.useMutation({
    onSuccess: async () => { setText(""); await Promise.all([utils.support.thread.invalidate(), utils.support.threads.invalidate()]); },
    onError: e => toast.error(e.message || "Could not send reply"),
  });

  const list = (threads as any[]) || [];
  const active = useMemo(() => list.find(t => t.userId === selected), [list, selected]);
  const totalUnread = list.reduce((n, t) => n + (t.unread || 0), 0);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || selected == null) return;
    reply.mutate({ userId: selected, content: t });
  };

  return (
    <AdminLayout title="Support" description={totalUnread > 0 ? `${totalUnread} unread message${totalUnread === 1 ? "" : "s"}` : "Customer conversations"}>
      <div className="border border-ink/15 bg-card grid lg:grid-cols-[300px_1fr] h-[68vh] overflow-hidden">
        {/* thread list */}
        <div className={`border-r border-ink/15 overflow-y-auto ${selected != null ? "hidden lg:block" : "block"}`}>
          {isLoading ? (
            <div className="p-8 grid place-items-center tech-label"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Inbox className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="font-medium text-sm">No messages yet.</p>
            </div>
          ) : (
            list.map(t => (
              <button
                key={t.userId}
                onClick={() => setSelected(t.userId)}
                className={`w-full text-left p-4 border-b border-ink/10 transition-colors ${selected === t.userId ? "bg-secondary" : "hover:bg-secondary/60"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm truncate">{t.userName || t.userEmail || `User #${t.userId}`}</span>
                  {t.unread > 0 && <span className="min-w-[18px] h-[18px] px-1 grid place-items-center bg-signal text-white text-[10px] font-bold rounded-full shrink-0">{t.unread}</span>}
                </div>
                <p className="tech-label normal-case tracking-normal font-medium mt-1 truncate">
                  {t.lastSender === "admin" && <span className="text-muted-foreground">You: </span>}{t.lastMessage}
                </p>
              </button>
            ))
          )}
        </div>

        {/* conversation */}
        <div className={`flex flex-col min-w-0 ${selected == null ? "hidden lg:flex" : "flex"}`}>
          {selected == null ? (
            <div className="flex-1 grid place-items-center text-muted-foreground">
              <div className="text-center"><MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" /><p className="font-medium text-sm">Select a conversation</p></div>
            </div>
          ) : (
            <>
              <div className="border-b border-ink/15 p-3 flex items-center gap-2">
                <button onClick={() => setSelected(null)} className="lg:hidden w-8 h-8 grid place-items-center hover:text-signal" aria-label="Back"><ChevronLeft className="w-5 h-5" /></button>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">{active?.userName || "Customer"}</div>
                  <div className="tech-label normal-case tracking-normal font-medium truncate">{active?.userEmail || ""}</div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {((messages as any[]) || []).map((m: any) => (
                  <AdminBubble key={m.id} mine={m.sender === "admin"} content={m.content} at={m.createdAt} />
                ))}
                <div ref={endRef} />
              </div>

              <form onSubmit={onSubmit} className="border-t border-ink/15 p-3 flex items-center gap-2">
                <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a reply…" className="field !py-2.5" maxLength={2000} />
                <button type="submit" disabled={reply.isPending || !text.trim()} className="btn btn-primary !py-2.5 !px-4 shrink-0">
                  {reply.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function AdminBubble({ mine, content, at }: { mine: boolean; content: string; at: string | Date }) {
  const time = new Date(at).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] px-3.5 py-2.5 text-sm ${mine ? "bg-ink text-paper" : "bg-secondary text-ink"}`}>
        <p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>
        <div className={`text-[10px] mt-1 ${mine ? "text-paper/60" : "text-muted-foreground"}`}>{time}</div>
      </div>
    </div>
  );
}
