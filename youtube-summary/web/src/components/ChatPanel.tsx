import { FormEvent, useEffect, useRef, useState } from "react";
import { sendChatMessage, ApiError } from "../api/client";
import { ChatMessage } from "../types/analysis";

export function ChatPanel({ sessionId, videoTitle }: { sessionId: string; videoTitle: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const reply = await sendChatMessage(sessionId, text);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="chat-panel">
      <h3>Discuter de « {videoTitle} »</h3>
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">Posez une question sur le contenu de la vidéo.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble chat-${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="chat-bubble chat-assistant chat-typing">…</div>}
        <div ref={bottomRef} />
      </div>
      {error && <p className="chat-error">{error}</p>}
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Votre question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Envoyer
        </button>
      </form>
    </section>
  );
}
