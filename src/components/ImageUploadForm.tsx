"use client";

import { useState, useRef } from "react";

interface QueueItem {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  title?: string;
  message?: string;
}

export default function ImageUploadForm({ onUploaded }: { readonly onUploaded?: () => void }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFiles() {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;
    const newItems: QueueItem[] = Array.from(files).map((file) => ({
      file,
      status: "pending" as const,
    }));
    setQueue((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function processQueue(items: QueueItem[]) {
    if (processing) return;
    setProcessing(true);

    const pending = items.filter((q) => q.status === "pending");

    for (const item of pending) {
      setQueue((prev) =>
        prev.map((q) => (q.file === item.file ? { ...q, status: "uploading" } : q))
      );

      try {
        const formData = new FormData();
        formData.append("file", item.file);
        const res = await fetch("/api/ingest-image", { method: "POST", body: formData });
        const data = await res.json();

        if (res.ok) {
          setQueue((prev) =>
            prev.map((q) =>
              q.file === item.file
                ? { ...q, status: "done", title: data.title, message: data.message }
                : q
            )
          );
          onUploaded?.();
        } else {
          setQueue((prev) =>
            prev.map((q) =>
              q.file === item.file
                ? { ...q, status: "error", message: data.error || `HTTP ${res.status}` }
                : q
            )
          );
        }
      } catch (err) {
        setQueue((prev) =>
          prev.map((q) =>
            q.file === item.file ? { ...q, status: "error", message: `${err}` } : q
          )
        );
      }
    }

    setProcessing(false);
  }

  const pending = queue.filter((q) => q.status === "pending");
  const done = queue.filter((q) => q.status === "done");
  const errors = queue.filter((q) => q.status === "error");

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-wrap items-center gap-2 w-full">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFiles}
          className="min-w-0 flex-1 text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-gray-200 file:text-gray-700 file:cursor-pointer"
          disabled={processing}
        />
        {pending.length > 0 && !processing && (
          <button
            onClick={() => processQueue(queue)}
            className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
          >
            Extraire ({pending.length})
          </button>
        )}
        {processing && (
          <span className="text-sm text-orange-600">
            Analyse en cours...
          </span>
        )}
      </div>

      {/* Statut */}
      {queue.length > 0 && (
        <div className="text-xs space-y-1">
          {done.map((q, i) => (
            <div key={`done-${i}`} className="text-green-700 flex items-center gap-1.5">
              <span>✓</span>
              <span className="truncate">{q.title || q.file.name}</span>
            </div>
          ))}
          {errors.map((q, i) => (
            <div key={`err-${i}`} className="text-red-600 flex items-start gap-1.5">
              <span>✕</span>
              <span className="min-w-0">
                <span className="truncate inline-block max-w-full">{q.file.name}</span>{" "}
                — {q.message}
              </span>
            </div>
          ))}
          {(done.length > 0 || errors.length > 0) && !processing && pending.length === 0 && (
            <button
              onClick={() => setQueue([])}
              className="text-gray-400 hover:text-gray-600 text-xs underline"
            >
              effacer
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Formats acceptés : JPG, PNG, WebP. L&apos;extraction prend ~10-30 s par image.
      </p>
    </div>
  );
}
