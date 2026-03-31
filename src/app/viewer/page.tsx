"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ViewerContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("book");
  const page = searchParams.get("page");
  const title = searchParams.get("title") || "Livre";

  if (!bookId) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Aucun livre sélectionné</p>
      </div>
    );
  }

  const pdfUrl = `/api/books/${bookId}/pdf${page ? `#page=${page}` : ""}`;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="border-b bg-white px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          {page && <p className="text-xs text-gray-500">Page {page}</p>}
        </div>
        <a
          href="/"
          className="px-3 py-1 border rounded text-sm text-gray-600 hover:bg-gray-100"
        >
          Retour au chat
        </a>
      </header>
      <div className="flex-1">
        <iframe
          src={pdfUrl}
          className="w-full h-full border-0"
          title={title}
        />
      </div>
    </div>
  );
}

export default function ViewerPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Chargement...</div>}>
      <ViewerContent />
    </Suspense>
  );
}
