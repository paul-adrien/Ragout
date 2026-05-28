import { readFile } from "fs/promises";
import { db } from "@/lib/db";
import { books, chunks } from "@/lib/db/schema";
import { analyzeImage } from "@/lib/ollama/vision";
import { getEmbedding } from "@/lib/ollama/embeddings";

const RECIPE_EXTRACTION_PROMPT = `Tu es un assistant qui extrait des recettes de cuisine depuis des images (photos ou captures d'écran).

Analyse l'image et restitue la recette dans CE FORMAT EXACT, sans introduction ni commentaire :

Titre: <nom de la recette>
Source: <auteur ou source si visible, sinon "non précisée">
Pour: <nombre de personnes si indiqué, sinon "non précisé">
Temps de préparation: <durée si indiquée, sinon "non précisée">
Temps de cuisson: <durée si indiquée, sinon "non précisée">
Difficulté: <niveau si indiqué, sinon "non précisée">

Description: <résumé bref de la recette en 1-2 phrases>

Ingrédients:
- <ingrédient et quantité>
- <ingrédient et quantité>
...

Étapes:
1. <première étape>
2. <deuxième étape>
...

Notes: <notes additionnelles si pertinentes, sinon laisse vide>

RÈGLES STRICTES :
- Réponds en français, même si le texte de l'image est dans une autre langue (traduis-le).
- Respecte EXACTEMENT le format ci-dessus (les libellés en français suivis de deux points).
- Si l'image ne contient PAS une recette de cuisine, réponds EXACTEMENT et UNIQUEMENT : AUCUNE_RECETTE`;

export class NotARecipeError extends Error {
  constructor() {
    super("L'image ne semble pas contenir de recette");
    this.name = "NotARecipeError";
  }
}

function clean(s: string | null | undefined): string | null {
  if (!s) return null;
  return s.replaceAll("\x00", "");
}

function extractTitle(text: string, fallback: string): string {
  const match = /^Titre\s*:\s*(.+)$/m.exec(text);
  const title = match?.[1]?.trim();
  return title && title.length > 0 ? title : fallback;
}

function extractSource(text: string): string | null {
  const match = /^Source\s*:\s*(.+)$/m.exec(text);
  const src = match?.[1]?.trim();
  if (!src || src.toLowerCase().startsWith("non précisé")) return null;
  return src;
}

interface IngestImageResult {
  bookId: number;
  title: string;
}

/**
 * Pipeline d'ingestion d'une image de recette :
 *   image → vision LLM (extraction structurée) → embedding → DB (book + 1 chunk).
 * Le fichier image doit déjà avoir été écrit à `filePath`.
 */
export async function ingestImage(
  filePath: string,
  filename: string
): Promise<IngestImageResult> {
  const buffer = await readFile(filePath);
  const extracted = (await analyzeImage(buffer, RECIPE_EXTRACTION_PROMPT)).trim();

  if (/^AUCUNE_RECETTE\b/i.test(extracted)) {
    throw new NotARecipeError();
  }

  const fallbackTitle = filename.replace(/\.[^.]+$/, "");
  const title = extractTitle(extracted, fallbackTitle);
  const author = extractSource(extracted);

  const [book] = await db
    .insert(books)
    .values({
      title: clean(title)!,
      author: clean(author),
      filename,
      fileType: "image",
    })
    .returning();

  // 1 image = 1 chunk : la recette extraite tient toujours sur une "page"
  const embedding = await getEmbedding(extracted);

  await db.insert(chunks).values({
    bookId: book.id,
    content: clean(extracted)!,
    chapter: null,
    page: null,
    chunkIndex: 0,
    embedding,
  });

  return { bookId: book.id, title };
}
