"use client";

import { useState, useEffect, useCallback } from "react";
import ChatInterface from "@/components/ChatInterface";
import BookList from "@/components/BookList";
import Header from "@/components/Header";

interface Conversation {
  id: number;
  title: string;
  updatedAt: string;
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [chatKey, setChatKey] = useState(0); // incrémenté uniquement sur "nouveau chat" ou clic sidebar
  // Fermée par défaut (mobile-first) ; ouverte au mount si on est sur grand écran.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [booksOpen, setBooksOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) setConversations(await res.json());
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Sur desktop (≥ md), la sidebar est une colonne visible par défaut.
  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) setSidebarOpen(true);
  }, []);

  function closeSidebarOnMobile() {
    if (window.matchMedia("(max-width: 767px)").matches) setSidebarOpen(false);
  }

  function handleNewChat() {
    setActiveConvId(null);
    setChatKey((k) => k + 1);
    closeSidebarOnMobile();
  }

  function handleSelectConversation(id: number) {
    setActiveConvId(id);
    setChatKey((k) => k + 1);
    closeSidebarOnMobile();
  }

  function handleConversationCreated(id: number) {
    // Ne PAS changer chatKey ici — le composant chat est déjà actif et stream
    setActiveConvId(id);
    loadConversations();
  }

  return (
    <main className="h-dvh flex flex-col bg-gray-50 overflow-hidden">
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenBooks={() => setBooksOpen(true)}
        onNewChat={handleNewChat}
      />

      {/* Body */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Backdrop (mobile uniquement, quand le drawer est ouvert) */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Fermer l'historique"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
          />
        )}

        {/* Sidebar : drawer overlay en mobile, colonne inline en desktop */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-72 border-r bg-white overflow-y-auto
            transform transition-transform duration-200 ease-out
            md:static md:z-auto md:w-64 md:transform-none md:transition-none
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"}
          `}
        >
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

        {/* Chat */}
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
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
