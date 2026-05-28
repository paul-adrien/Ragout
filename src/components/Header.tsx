"use client";

import Link from "next/link";

interface HeaderProps {
  readonly onToggleSidebar: () => void;
  readonly onOpenBooks: () => void;
  readonly onNewChat: () => void;
  readonly onOpenReport: () => void;
}

export default function Header({
  onToggleSidebar,
  onOpenBooks,
  onNewChat,
  onOpenReport,
}: HeaderProps) {
  return (
    <header className="border-b bg-white px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-1 text-gray-500 hover:text-gray-700 text-lg shrink-0"
          title="Historique"
          aria-label="Ouvrir l'historique"
        >
          ☰
        </button>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">RAGout</h1>
          <p className="hidden sm:block text-xs text-gray-500">Copilote de cuisine</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={onOpenReport}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1 border rounded text-sm text-gray-600 hover:bg-gray-100"
          title="Signaler un problème"
        >
          <span>🚩</span>
          <span className="hidden sm:inline">Signaler</span>
        </button>
        <Link
          href="/reports"
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1 border rounded text-sm text-gray-600 hover:bg-gray-100"
          title="Liste des signalements"
        >
          <span>📋</span>
          <span className="hidden sm:inline">Signalements</span>
        </Link>
        <button
          onClick={onOpenBooks}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1 border rounded text-sm text-gray-600 hover:bg-gray-100"
          title="Bibliothèque"
        >
          <span>📚</span>
          <span className="hidden sm:inline">Livres</span>
        </button>
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1 border rounded text-sm text-gray-600 hover:bg-gray-100"
          title="Nouveau chat"
        >
          <span className="text-base leading-none">＋</span>
          <span className="hidden sm:inline">Nouveau chat</span>
        </button>
      </div>
    </header>
  );
}
