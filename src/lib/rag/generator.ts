import { chatCompletion, chatStream } from "@/lib/ollama/chat";
import { retrieveChunks, type RetrievedChunk } from "./retriever";

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  query: string;
  lang?: "fr" | "en";
  history?: HistoryMessage[];
  constraints?: {
    ingredients?: string[];
    allergies?: string[];
    cuisineStyle?: string;
    maxTime?: number; // minutes
    level?: string; // débutant, intermédiaire, avancé
  };
}

const LANG_LABELS = {
  fr: "français",
  en: "English",
} as const;

function buildSystemPrompt(chunks: RetrievedChunk[], lang: "fr" | "en" = "fr", constraints?: ChatRequest["constraints"]): string {
  let prompt = `Tu es RAGout, un copilote de cuisine expert. Tu génères et adaptes des recettes en te basant sur une bibliothèque de livres de cuisine.

RÈGLES:
- Base tes réponses sur les extraits de livres fournis ci-dessous
- Si tu n'as pas assez d'info, dis-le clairement
- Réponds TOUJOURS en ${LANG_LABELS[lang]}
- Structure ta réponse avec: titre, résumé, ingrédients, étapes, temps estimé, source(s)

EXTRAITS DE LIVRES:
`;

  for (const chunk of chunks) {
    prompt += `\n--- Source: "${chunk.bookTitle}"${chunk.bookAuthor ? ` par ${chunk.bookAuthor}` : ""}${chunk.chapter ? ` (${chunk.chapter})` : ""} ---\n`;
    prompt += chunk.content + "\n";
  }

  if (constraints) {
    prompt += "\nCONTRAINTES UTILISATEUR:\n";
    if (constraints.ingredients?.length) {
      prompt += `- Ingrédients disponibles: ${constraints.ingredients.join(", ")}\n`;
    }
    if (constraints.allergies?.length) {
      prompt += `- Allergies/restrictions: ${constraints.allergies.join(", ")}\n`;
    }
    if (constraints.cuisineStyle) {
      prompt += `- Style de cuisine souhaité: ${constraints.cuisineStyle}\n`;
    }
    if (constraints.maxTime) {
      prompt += `- Temps max de préparation: ${constraints.maxTime} minutes\n`;
    }
    if (constraints.level) {
      prompt += `- Niveau du cuisinier: ${constraints.level}\n`;
    }
  }

  return prompt;
}

export async function generateRecipe(request: ChatRequest): Promise<string> {
  const chunks = await retrieveChunks(request.query, 5);
  const systemPrompt = buildSystemPrompt(chunks, request.lang, request.constraints);

  return chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: request.query },
  ]);
}

export interface RecipeSource {
  bookId: number;
  bookTitle: string;
  bookFilename: string;
  page: number | null;
  chapter: string | null;
}

export async function streamRecipeWithSources(request: ChatRequest): Promise<{
  sources: RecipeSource[];
  stream: AsyncGenerator<string>;
}> {
  const chunks = await retrieveChunks(request.query, 5);
  const systemPrompt = buildSystemPrompt(chunks, request.lang, request.constraints);

  // Dédupliquer les sources par bookId+page
  const seen = new Set<string>();
  const sources: RecipeSource[] = [];
  for (const chunk of chunks) {
    const key = `${chunk.bookId}-${chunk.page ?? "null"}`;
    if (!seen.has(key)) {
      seen.add(key);
      sources.push({
        bookId: chunk.bookId,
        bookTitle: chunk.bookTitle,
        bookFilename: chunk.bookFilename,
        page: chunk.page,
        chapter: chunk.chapter,
      });
    }
  }

  const historyMessages = (request.history || [])
    .slice(0, -1)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const stream = chatStream([
    { role: "system", content: systemPrompt },
    ...historyMessages,
    { role: "user", content: request.query },
  ]);

  return { sources, stream };
}
