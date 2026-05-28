"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface Book {
  id: number;
  title: string;
  fileType: string;
  author: string | null;
}

function ViewerContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("book");
  const page = searchParams.get("page");
  const titleFromUrl = searchParams.get("title") || "Livre";

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId) {
      setLoading(false);
      return;
    }
    fetch(`/api/books/${bookId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setBook(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [bookId]);

  if (!bookId) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Aucun livre sélectionné</p>
      </div>
    );
  }

  const displayTitle = book?.title || titleFromUrl;
  const isImage = book?.fileType === "image";
  const sourceUrl = isImage
    ? `/api/books/${bookId}/image`
    : `/api/books/${bookId}/pdf${page ? `#page=${page}` : ""}`;

  return (
    <div className="h-dvh flex flex-col bg-gray-50 overflow-hidden">
      <header className="border-b bg-white px-4 py-3 flex items-center justify-between shrink-0 gap-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
            {displayTitle}
          </h1>
          {!isImage && page && (
            <p className="text-xs text-gray-500">Page {page}</p>
          )}
          {isImage && (
            <p className="text-xs text-gray-500">Recette extraite depuis une image</p>
          )}
        </div>
        <a
          href="/"
          className="shrink-0 px-3 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-100"
        >
          ← Chat
        </a>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            Chargement...
          </div>
        ) : isImage ? (
          <div className="h-full overflow-auto flex items-center justify-center bg-gray-900 p-4">
            <img
              src={sourceUrl}
              alt={displayTitle}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <iframe src={sourceUrl} className="w-full h-full border-0" title={displayTitle} />
        )}
      </div>
    </div>
  );
}

export default function ViewerPage() {
  return (
    <Suspense fallback={<div className="h-dvh flex items-center justify-center">Chargement...</div>}>
      <ViewerContent />
    </Suspense>
  );
}
