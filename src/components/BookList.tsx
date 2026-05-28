"use client";

import { useState, useEffect } from "react";
import UploadForm from "./UploadForm";
import ImageUploadForm from "./ImageUploadForm";

interface Book {
  id: number;
  title: string;
  author: string | null;
  filename: string;
  fileType: string;
  createdAt: string;
  chunksCount: number;
}

export default function BookList({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) loadBooks();
  }, [open]);

  async function loadBooks() {
    setLoading(true);
    const res = await fetch("/api/books");
    if (res.ok) setBooks(await res.json());
    setLoading(false);
  }

  async function deleteBook(id: number) {
    if (!confirm("Supprimer ce livre et tous ses chunks ?")) return;
    const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
    if (res.ok) setBooks((prev) => prev.filter((b) => b.id !== id));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-gray-900">Bibliothèque</h2>
          <button onClick={onClose} className="p-1 -mr-1 text-gray-400 hover:text-gray-600 text-2xl leading-none">
            ×
          </button>
        </div>
        {/* Ajout de livres (PDF / EPUB) */}
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            📚 Ajouter un livre
          </h3>
          <UploadForm onUploaded={loadBooks} />
        </div>

        {/* Ajout d'une recette depuis une image (photo ou screenshot) */}
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            📷 Ajouter une recette depuis une photo
          </h3>
          <ImageUploadForm onUploaded={loadBooks} />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <p className="text-sm text-gray-400">Chargement...</p>}
          {!loading && books.length === 0 && (
            <p className="text-sm text-gray-400">Aucun livre ingéré.</p>
          )}
          {books.map((book) => (
            <div key={book.id} className="flex items-start justify-between py-3 border-b last:border-0">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-gray-900 truncate">{book.title}</p>
                {book.author && <p className="text-xs text-gray-500">{book.author}</p>}
                <p className="text-xs text-gray-400 mt-0.5">
                  {book.fileType.toUpperCase()} · {book.chunksCount} chunks · {new Date(book.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <button
                onClick={() => deleteBook(book.id)}
                className="ml-3 text-xs text-red-500 hover:text-red-700 shrink-0"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
