import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { fileToBase64 } from "@/lib/image";
import { useAuth } from "@/_core/hooks/useAuth";
import { Send, Loader, Sparkles, ImagePlus, X, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { TechLabel } from "@/components/tech";

const SUGGESTIONS = [
  "What would Mbappé wear casually?",
  "Best colorway for a Napoli fan?",
  "Recommend a red jersey",
];

type ChatMsg = { role: string; content: string; products?: any[]; image?: string };

export default function Chat() {
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ b64Json: string; mimeType: string; preview: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: chatHistory } = trpc.chat.history.useQuery(undefined, { enabled: isAuthenticated });

  const sendMessage = trpc.chat.send.useMutation({
    onSuccess: (data: any) => setMessages(prev => [...prev, { role: "assistant", content: data.message, products: data.products }]),
    onError: (error: any) => toast.error(error.message || "Failed to send message"),
  });

  useEffect(() => {
    if (chatHistory && messages.length === 0) setMessages(chatHistory.map((m: any) => ({ role: m.role, content: m.content })));
  }, [chatHistory]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <h2 className="display text-4xl mb-4">Sign in to chat</h2>
          <Link href="/login" className="btn btn-primary">Sign in</Link>
        </div>
      </Layout>
    );
  }

  const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image");
    const { b64Json, mimeType } = await fileToBase64(file);
    setPendingImage({ b64Json, mimeType, preview: URL.createObjectURL(file) });
  };

  const send = async (text: string) => {
    if (!text.trim() && !pendingImage) return;
    const image = pendingImage;
    setInput("");
    setPendingImage(null);
    setMessages(prev => [...prev, { role: "user", content: text || "Sent an image", image: image?.preview }]);
    setIsLoading(true);
    await sendMessage.mutateAsync({
      message: text,
      image: image ? { b64Json: image.b64Json, mimeType: image.mimeType } : undefined,
    });
    setIsLoading(false);
  };

  return (
    <Layout footer={false}>
      <section className="border-b border-ink">
        <div className="container py-8">
          <div className="flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-signal" /><TechLabel ink>HEIS Expert</TechLabel></div>
          <h1 className="display text-4xl">Ask the expert</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">Football-savvy AI — upload a photo or ask for recommendations.</p>
        </div>
      </section>

      <div className="container py-8 max-w-3xl flex flex-col" style={{ minHeight: "60vh" }}>
        <div className="flex-1 space-y-4 mb-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="display text-6xl text-signal mb-4">⚽</div>
              <p className="display text-2xl mb-1">Welcome to HEIS Expert</p>
              <p className="text-sm text-muted-foreground font-medium mb-6">Ask anything, or upload a photo to find similar gear.</p>
              <div className="flex flex-col items-center gap-2 max-w-md mx-auto">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} className="w-full text-left px-4 py-3 border border-ink/15 hover:border-signal hover:text-signal transition-colors text-sm font-medium">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`max-w-md px-4 py-3 text-sm font-medium ${msg.role === "user" ? "surface-dark" : "bg-secondary text-ink border-l-2 border-signal"}`}>
                  {msg.image && <img src={msg.image} alt="upload" className="w-32 h-32 object-cover mb-2" />}
                  {msg.content}
                </div>
                {/* recommended product cards */}
                {msg.products && msg.products.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2 max-w-md w-full">
                    {msg.products.map((p: any) => (
                      <Link key={p.id} href={`/product/${p.id}`} className="group border border-ink/15 hover:border-signal transition-colors bg-card">
                        <div className="aspect-square overflow-hidden bg-card">
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-2">
                          <p className="text-[11px] font-bold leading-tight line-clamp-2">{p.name}</p>
                          <p className="tech-label mt-1 inline-flex items-center gap-0.5">₦{Number(p.price).toLocaleString()} <ArrowUpRight className="w-3 h-3" /></p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-secondary px-4 py-3 border-l-2 border-signal"><Loader className="w-5 h-5 animate-spin" /></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* pending image chip */}
        {pendingImage && (
          <div className="flex items-center gap-2 mb-2">
            <div className="relative">
              <img src={pendingImage.preview} alt="to send" className="w-14 h-14 object-cover border border-ink" />
              <button onClick={() => setPendingImage(null)} className="absolute -top-2 -right-2 w-5 h-5 grid place-items-center surface-dark rounded-full" aria-label="Remove image">
                <X className="w-3 h-3" />
              </button>
            </div>
            <span className="tech-label">Image attached</span>
          </div>
        )}

        <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2 sticky bottom-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-outline shrink-0 !px-3" aria-label="Upload image">
            <ImagePlus className="w-5 h-5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask, or attach a photo…"
            className="field flex-1"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || (!input.trim() && !pendingImage)} className="btn btn-primary shrink-0">
            {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </Layout>
  );
}
