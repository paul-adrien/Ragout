import type { ParsedSection } from "./parser";

export interface Chunk {
  content: string;
  chapter?: string;
  page?: number;
  chunkIndex: number;
}

const DEFAULT_CHUNK_SIZE = 1000; // caractères
const DEFAULT_OVERLAP = 200;

export function chunkSections(
  sections: ParsedSection[],
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP
): Chunk[] {
  const rawChunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const text = section.text.trim();
    if (text.length < 50) continue;

    // Si la section tient dans un chunk, on la garde entière
    if (text.length <= chunkSize * 1.5) {
      rawChunks.push({
        content: text,
        chapter: section.chapter,
        page: section.page,
        chunkIndex: chunkIndex++,
      });
      continue;
    }

    // Sinon on découpe par paragraphes puis par taille
    const paragraphs = text.split(/\n{2,}/);
    let currentChunk = "";

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      if (currentChunk.length + trimmed.length > chunkSize && currentChunk.length > 0) {
        rawChunks.push({
          content: currentChunk.trim(),
          chapter: section.chapter,
          page: section.page,
          chunkIndex: chunkIndex++,
        });

        // Overlap
        const words = currentChunk.split(/\s+/);
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(" ") + " " + trimmed;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
      }
    }

    if (currentChunk.trim().length > 50) {
      rawChunks.push({
        content: currentChunk.trim(),
        chapter: section.chapter,
        page: section.page,
        chunkIndex: chunkIndex++,
      });
    }
  }

  // Redécouper les chunks trop longs
  const finalChunks: Chunk[] = [];
  let finalIndex = 0;

  for (const chunk of rawChunks) {
    if (chunk.content.length <= chunkSize * 1.5) {
      finalChunks.push({ ...chunk, chunkIndex: finalIndex++ });
    } else {
      let start = 0;
      while (start < chunk.content.length) {
        const end = Math.min(start + chunkSize, chunk.content.length);
        const slice = chunk.content.slice(start, end).trim();
        if (slice.length > 50) {
          finalChunks.push({
            content: slice,
            chapter: chunk.chapter,
            page: chunk.page,
            chunkIndex: finalIndex++,
          });
        }
        start += chunkSize - overlap;
      }
    }
  }

  return finalChunks;
}
