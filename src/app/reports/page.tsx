"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ReportContextMessage } from "@/lib/db/schema";

type Status = "open" | "blocked" | "resolved" | "archived";

interface Report {
  id: number;
  conversationId: number | null;
  description: string;
  status: Status;
  contextMessages: ReportContextMessage[];
  createdAt: string;
  resolvedAt: string | null;
}

const STATUS_META: Record<Status, { label: string; color: string }> = {
  open: { label: "Ouvert", color: "bg-blue-100 text-blue-700 border-blue-200" },
  blocked: { label: "Bloqué", color: "bg-amber-100 text-amber-700 border-amber-200" },
  resolved: { label: "Résolu", color: "bg-green-100 text-green-700 border-green-200" },
  archived: { label: "Archivé", color: "bg-gray-200 text-gray-600 border-gray-300" },
};

type Filter = Status | "all";
const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "open", label: "Ouverts" },
  { value: "blocked", label: "Bloqués" },
  { value: "resolved", label: "Résolus" },
  { value: "archived", label: "Archivés" },
];

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/reports");
    if (res.ok) setReports(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => (filter === "all" ? reports : reports.filter((r) => r.status === filter)),
    [reports, filter]
  );

  async function updateStatus(id: number, status: Status) {
    const res = await fetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
    }
  }

  async function deleteReport(id: number) {
    if (!confirm("Supprimer définitivement ce signalement ?")) return;
    const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (expanded === id) setExpanded(null);
    }
  }

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: reports.length, open: 0, blocked: 0, resolved: 0, archived: 0 };
    for (const r of reports) c[r.status]++;
    return c;
  }, [reports]);

  return (
    <main className="h-dvh flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="border-b bg-white px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="p-2 -ml-1 text-gray-500 hover:text-gray-700 text-lg shrink-0"
            title="Retour au chat"
          >
            ←
          </Link>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
            📋 Signalements
          </h1>
        </div>
        <span className="text-xs text-gray-500 shrink-0">
          {reports.length} au total
        </span>
      </header>

      {/* Filtres */}
      <div className="border-b bg-white px-3 sm:px-4 py-2 flex gap-1.5 overflow-x-auto shrink-0">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs border ${
              filter === opt.value
                ? "bg-orange-600 text-white border-orange-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
            }`}
          >
            {opt.label} ({counts[opt.value]})
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-2">
        {loading && <p className="text-sm text-gray-400">Chargement...</p>}
        {!loading && visible.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-10">
            Aucun signalement {filter !== "all" ? `(${STATUS_META[filter as Status].label.toLowerCase()})` : ""}.
          </p>
        )}
        {visible.map((r) => {
          const isOpen = expanded === r.id;
          const meta = STATUS_META[r.status];
          return (
            <div key={r.id} className="bg-white border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : r.id)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded border ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      #{r.id} · {new Date(r.createdAt).toLocaleString("fr-FR")}
                    </span>
                    {r.contextMessages.length > 0 && (
                      <span className="text-xs text-gray-400">
                        · {r.contextMessages.length} msg
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-2">
                    {r.description}
                  </p>
                </div>
                <span className="text-gray-400 text-sm shrink-0">{isOpen ? "▴" : "▾"}</span>
              </button>

              {isOpen && (
                <div className="border-t bg-gray-50 px-4 py-3 space-y-3">
                  {/* Description complète */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</h3>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.description}</p>
                  </div>

                  {/* Messages capturés */}
                  {r.contextMessages.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        Contexte capturé ({r.contextMessages.length})
                      </h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto bg-white border rounded p-2">
                        {r.contextMessages.map((m, i) => (
                          <div
                            key={i}
                            className={`text-xs rounded px-2 py-1.5 ${
                              m.role === "user" ? "bg-orange-50" : "bg-gray-100"
                            }`}
                          >
                            <div className="font-semibold text-gray-600 mb-0.5">
                              {m.role === "user" ? "Utilisateur" : "Assistant"}
                            </div>
                            <div className="text-gray-800 whitespace-pre-wrap">{m.content}</div>
                            {m.sources && m.sources.length > 0 && (
                              <div className="mt-1 text-[10px] text-gray-500">
                                Sources : {m.sources.map((s) => s.bookTitle).join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Méta */}
                  <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                    {r.conversationId !== null && (
                      <span>Conversation #{r.conversationId}</span>
                    )}
                    {r.resolvedAt && (
                      <span>Résolu le {new Date(r.resolvedAt).toLocaleString("fr-FR")}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(["open", "blocked", "resolved", "archived"] as Status[])
                      .filter((s) => s !== r.status)
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateStatus(r.id, s)}
                          className={`text-xs px-3 py-1.5 border rounded hover:bg-white ${STATUS_META[s].color}`}
                        >
                          → {STATUS_META[s].label}
                        </button>
                      ))}
                    <button
                      type="button"
                      onClick={() => deleteReport(r.id)}
                      className="text-xs px-3 py-1.5 border rounded text-red-600 border-red-200 hover:bg-red-50 ml-auto"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
