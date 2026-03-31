import { db } from "@/lib/db";
import { books, chunks } from "@/lib/db/schema";
import { parseBook } from "./parser";
import { chunkSections } from "./chunker";
import { getEmbeddings } from "@/lib/ollama/embeddings";

function clean(s: string | null | undefined): string | null {
  if (!s) return null;
  return s.replaceAll("\x00", "");
}

interface IngestResult {
  bookId: number;
  chunksCount: number;
}

export async function ingestBook(
  filePath: string,
  filename: string,
  fileType: string
): Promise<IngestResult> {
  const parsed = await parseBook(filePath, fileType);

  const [book] = await db
    .insert(books)
    .values({
      title: clean(parsed.metadata.title) || filename.replace(/\.[^.]+$/, ""),
      author: clean(parsed.metadata.author),
      filename,
      fileType,
    })
    .returning();

  const textChunks = chunkSections(parsed.sections);

  if (textChunks.length === 0) {
    return { bookId: book.id, chunksCount: 0 };
  }

  const BATCH_SIZE = 10;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
    const batch = textChunks.slice(i, i + BATCH_SIZE);
    const embeddings = await getEmbeddings(batch.map((c) => c.content));
    allEmbeddings.push(...embeddings);
  }

  const chunkValues = textChunks.map((chunk, i) => ({
    bookId: book.id,
    content: clean(chunk.content)!,
    chapter: clean(chunk.chapter),
    page: chunk.page || null,
    chunkIndex: chunk.chunkIndex,
    embedding: allEmbeddings[i],
  }));

  for (let i = 0; i < chunkValues.length; i += 50) {
    const batch = chunkValues.slice(i, i + 50);
    await db.insert(chunks).values(batch);
  }

  return { bookId: book.id, chunksCount: textChunks.length };
}
