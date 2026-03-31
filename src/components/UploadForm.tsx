"use client";

import { useState, useRef } from "react";

interface QueueItem {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  message?: string;
}

export default function UploadForm({ onUploaded }: { onUploaded?: () => void }) {
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

    const pending = items.filter((item) => item.status === "pending");

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];

      // Marquer comme uploading
      setQueue((prev) =>
        prev.map((q) => (q.file === item.file ? { ...q, status: "uploading" } : q))
      );

      try {
        const formData = new FormData();
        formData.append("file", item.file);

        const res = await fetch("/api/ingest", { method: "POST", body: formData });
        const data = await res.json();

        if (res.ok) {
          setQueue((prev) =>
            prev.map((q) =>
              q.file === item.file
                ? { ...q, status: "done", message: `${data.chunksCount} chunks` }
                : q
            )
          );
          onUploaded?.();
        } else {
          setQueue((prev) =>
            prev.map((q) =>
              q.file === item.file ? { ...q, status: "error", message: data.error } : q
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

  // Lancer le traitement quand la queue change
  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const uploadingCount = queue.filter((q) => q.status === "uploading").length;
  const doneCount = queue.filter((q) => q.status === "done").length;

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.epub"
        multiple
        onChange={handleFiles}
        className="text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-200 file:text-gray-700 file:cursor-pointer"
        disabled={processing}
      />
      {queue.length > 0 && !processing && pendingCount > 0 && (
        <button
          onClick={() => processQueue(queue)}
          className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
        >
          Lancer ({pendingCount})
        </button>
      )}
      {processing && (
        <span className="text-sm text-orange-600">
          Ingestion {doneCount + 1}/{doneCount + pendingCount + uploadingCount}...
        </span>
      )}
      {!processing && queue.length > 0 && pendingCount === 0 && (
        <span className="text-sm text-gray-600">
          {doneCount} ingéré{doneCount > 1 ? "s" : ""}
          {queue.some((q) => q.status === "error") && (
            <span className="text-red-500 ml-1">
              ({queue.filter((q) => q.status === "error").length} erreur{queue.filter((q) => q.status === "error").length > 1 ? "s" : ""})
            </span>
          )}
          <button
            onClick={() => setQueue([])}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </span>
      )}
    </div>
  );
}
