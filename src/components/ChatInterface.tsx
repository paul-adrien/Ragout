"use client";

import { useState, useRef, useEffect } from "react";
import ChatInput, { type Constraints, emptyConstraints } from "./ChatInput";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

interface Source {
  bookId: number;
  bookTitle: string;
  bookFilename: string;
  page: number | null;
  chapter: string | null;
}

interface ChatInterfaceProps {
  conversationId: number | null;
  onConversationCreated: (id: number) => void;
}

export default function ChatInterface({ conversationId, onConversationCreated }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [convId, setConvId] = useState<number | null>(conversationId);
  const [constraints, setConstraints] = useState<Constraints>(emptyConstraints);
  const [showConstraints, setShowConstraints] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) return;

    if (conversationId) {
      setConvId(conversationId);
      fetch(`/api/conversations/${conversationId}/messages`)
        .then((res) => res.json())
        .then((data) => {
          setMessages(data.map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })));
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function buildConstraintsPayload() {
    const c: Record<string, unknown> = {};
    if (constraints.ingredients.trim()) {
      c.ingredients = constraints.ingredients.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (constraints.allergies.trim()) {
      c.allergies = constraints.allergies.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (constraints.cuisineStyle.trim()) c.cuisineStyle = constraints.cuisineStyle.trim();
    if (constraints.maxTime.trim()) c.maxTime = Number.parseInt(constraints.maxTime);
    if (constraints.level) c.level = constraints.level;
    return Object.keys(c).length > 0 ? c : undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const query = input.trim();
    setInput("");
    const updatedMessages: Message[] = [...messages, { role: "user", content: query }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          lang,
          constraints: buildConstraintsPayload(),
          history: updatedMessages.slice(-10),
          conversationId: convId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Erreur: ${err.error}` },
        ]);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let metaExtracted = false;
      let sources: Source[] = [];
      let buffer = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Extraire les métadonnées du premier chunk
        if (!metaExtracted) {
          const metaEnd = buffer.indexOf("__END_META__");
          if (metaEnd === -1) continue; // attendre plus de données

          const metaStart = buffer.indexOf("__META__");
          if (metaStart !== -1) {
            const metaJson = buffer.slice(metaStart + 8, metaEnd);
            try {
              const meta = JSON.parse(metaJson);
              if (!convId && meta.convId) {
                setConvId(meta.convId);
                onConversationCreated(meta.convId);
              }
              sources = meta.sources || [];
            } catch { /* ignore parse error */ }
          }
          buffer = buffer.slice(metaEnd + 12);
          metaExtracted = true;
        }

        assistantContent = buffer;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: assistantContent,
            sources: sources.length > 0 ? sources : undefined,
          };
          return updated;
        });
      }

      // Mettre à jour avec les sources finales
      if (sources.length > 0) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            sources,
          };
          return updated;
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Erreur de connexion: ${err}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages (seule zone qui scrolle) */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-2xl mb-2">🍲</p>
            <p>Posez une question culinaire.</p>
            <p className="text-sm">Ex: &quot;Une recette de risotto aux champignons&quot;</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[80%]">
              <div
                className={`rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {msg.role === "assistant" && loading && !msg.content ? (
                  <span className="inline-flex gap-1 text-lg leading-none">
                    <span className="animate-bounce [animation-delay:0ms]">.</span>
                    <span className="animate-bounce [animation-delay:150ms]">.</span>
                    <span className="animate-bounce [animation-delay:300ms]">.</span>
                  </span>
                ) : (
                  msg.content
                )}
              </div>
              {/* Liens sources */}
              {msg.sources && msg.sources.length > 0 && !loading && (
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {msg.sources.map((src, j) => (
                    <a
                      key={j}
                      href={`/viewer?book=${src.bookId}&page=${src.page || 1}&title=${encodeURIComponent(src.bookTitle)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 bg-orange-50 px-2 py-1 rounded"
                    >
                      <span>📖</span>
                      <span>{src.bookTitle}</span>
                      {src.page && <span>— p.{src.page}</span>}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        loading={loading}
        lang={lang}
        onLangChange={setLang}
        constraints={constraints}
        onConstraintsChange={setConstraints}
        showConstraints={showConstraints}
        onToggleConstraints={() => setShowConstraints(!showConstraints)}
      />
    </div>
  );
}
