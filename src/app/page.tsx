"use client";

import { useState, useEffect, useCallback } from "react";
import ChatInterface from "@/components/ChatInterface";
import UploadForm from "@/components/UploadForm";
import BookList from "@/components/BookList";

interface Conversation {
  id: number;
  title: string;
  updatedAt: string;
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [chatKey, setChatKey] = useState(0); // incrémenté uniquement sur "nouveau chat" ou clic sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [booksOpen, setBooksOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) setConversations(await res.json());
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  function handleNewChat() {
    setActiveConvId(null);
    setChatKey((k) => k + 1);
  }

  function handleSelectConversation(id: number) {
    setActiveConvId(id);
    setChatKey((k) => k + 1);
  }

  function handleConversationCreated(id: number) {
    // Ne PAS changer chatKey ici — le composant chat est déjà actif et stream
    setActiveConvId(id);
    loadConversations();
  }

  return (
    <main className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-700 text-lg"
            title="Historique"
          >
            ☰
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">RAGout</h1>
            <p className="text-xs text-gray-500">Copilote de cuisine</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBooksOpen(true)}
            className="px-3 py-1 border rounded text-sm text-gray-600 hover:bg-gray-100"
          >
            Livres
          </button>
          <button
            onClick={handleNewChat}
            className="px-3 py-1 border rounded text-sm text-gray-600 hover:bg-gray-100"
          >
            + Nouveau chat
          </button>
          <UploadForm />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-64 border-r bg-white overflow-y-auto shrink-0">
            <div className="p-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                Conversations
              </h2>
              {conversations.length === 0 && (
                <p className="text-xs text-gray-400">Aucune conversation</p>
              )}
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm truncate mb-1 ${
                    activeConvId === conv.id
                      ? "bg-orange-100 text-orange-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {conv.title}
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            key={chatKey}
            conversationId={activeConvId}
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </div>
      <BookList open={booksOpen} onClose={() => setBooksOpen(false)} />
    </main>
  );
}
