import { db } from "@/lib/db";
import { chunks, books } from "@/lib/db/schema";
import { getEmbedding } from "@/lib/ollama/embeddings";
import { sql, eq } from "drizzle-orm";

export interface RetrievedChunk {
  content: string;
  chapter: string | null;
  page: number | null;
  bookId: number;
  bookTitle: string;
  bookAuthor: string | null;
  bookFilename: string;
  similarity: number;
}

export async function retrieveChunks(
  query: string,
  topK = 5
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await getEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const results = await db
    .select({
      content: chunks.content,
      chapter: chunks.chapter,
      page: chunks.page,
      bookId: books.id,
      bookTitle: books.title,
      bookAuthor: books.author,
      bookFilename: books.filename,
      similarity: sql<number>`1 - (${chunks.embedding} <=> ${embeddingStr}::vector)`.as(
        "similarity"
      ),
    })
    .from(chunks)
    .innerJoin(books, eq(chunks.bookId, books.id))
    .orderBy(sql`${chunks.embedding} <=> ${embeddingStr}::vector`)
    .limit(topK);

  return results;
}
