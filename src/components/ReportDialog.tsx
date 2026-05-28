"use client";

import { useState, useEffect } from "react";
import type { ReportContextMessage } from "@/lib/db/schema";

interface ReportDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly conversationId: number | null;
  readonly messages: ReportContextMessage[];
}

// Choix proposés pour le nombre de messages à capturer ; "all" = tous les disponibles
const COUNT_OPTIONS = [1, 3, 5, 10, "all"] as const;
type CountOption = (typeof COUNT_OPTIONS)[number];

export default function ReportDialog({
  open,
  onClose,
  conversationId,
  messages,
}: ReportDialogProps) {
  const [description, setDescription] = useState("");
  const [countOption, setCountOption] = useState<CountOption>(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset à chaque ouverture
  useEffect(() => {
    if (open) {
      setDescription("");
      setCountOption(5);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const total = messages.length;
  const captureCount =
    countOption === "all" ? total : Math.min(countOption, total);
  const captured = total === 0 ? [] : messages.slice(-captureCount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          conversationId,
          contextMessages: captured,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-gray-900">🚩 Signaler un problème</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 -mr-1 text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">
              Que s&apos;est-il passé ?
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le problème : mauvaise réponse, hors sujet, erreur de langue, source manquante..."
              rows={4}
              className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              required
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">
              Inclure les derniers messages
            </span>
            <select
              value={String(countOption)}
              onChange={(e) => {
                const v = e.target.value;
                setCountOption(v === "all" ? "all" : (Number.parseInt(v) as CountOption));
              }}
              className="border rounded px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={total === 0}
            >
              {COUNT_OPTIONS.map((opt) => (
                <option key={opt} value={String(opt)}>
                  {opt === "all" ? "Tous" : `${opt} derniers`}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500">
              {total === 0
                ? "Aucun message dans le chat — seule la description sera enregistrée."
                : `${captureCount} message${captureCount > 1 ? "s" : ""} sur ${total} sera${captureCount > 1 ? "ont" : ""} capturé${captureCount > 1 ? "s" : ""}.`}
            </span>
          </label>

          {captured.length > 0 && (
            <details className="border rounded bg-gray-50">
              <summary className="cursor-pointer px-3 py-2 text-xs text-gray-600 select-none">
                Aperçu des messages capturés
              </summary>
              <div className="px-3 py-2 space-y-2 max-h-48 overflow-y-auto border-t">
                {captured.map((m, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-semibold text-gray-700">
                      {m.role === "user" ? "Vous" : "Assistant"} :
                    </span>{" "}
                    <span className="text-gray-600 whitespace-pre-wrap">
                      {m.content.length > 200 ? m.content.slice(0, 200) + "…" : m.content}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}
        </form>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
            disabled={submitting}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
            disabled={submitting || !description.trim()}
            className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50"
          >
            {submitting ? "Envoi..." : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}
