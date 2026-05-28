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

  // Rappel de langue en dernier : c'est l'instruction la mieux suivie par le modèle,
  // et elle contre la tendance à répondre dans la langue des extraits (souvent en anglais).
  prompt += `\n\nIMPORTANT — LANGUE DE RÉPONSE: Rédige l'INTÉGRALITÉ de ta réponse en ${LANG_LABELS[lang]} (titre, résumé, ingrédients, étapes, tout). Les extraits ci-dessus peuvent être dans une autre langue : traduis et adapte leur contenu, mais ta réponse doit être exclusivement en ${LANG_LABELS[lang]}.`;

  return prompt;
}

/**
 * Reformule la dernière question en requête de recherche autonome, en intégrant
 * le contexte de la conversation. Sans ça, un suivi du type "j'aimerais d'autres
 * recettes" déclenche un retrieval aveugle qui ramène des chunks hors sujet.
 */
async function rewriteQueryWithHistory(
  query: string,
  history: HistoryMessage[]
): Promise<string> {
  // history inclut le message courant en dernier → on le retire pour ne pas le dupliquer
  const previous = history.slice(0, -1);
  if (previous.length === 0) return query;

  const transcript = previous
    .map((m) => `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${m.content}`)
    .join("\n");

  const system =
    "Tu reformules la dernière question d'un utilisateur en une requête de recherche AUTONOME pour un moteur de recherche culinaire. " +
    "Intègre le contexte de la conversation (plat, ingrédients, technique déjà évoqués) seulement si la nouvelle question en dépend. " +
    "Réponds UNIQUEMENT par la requête reformulée en français, sur une seule ligne, sans préambule, sans guillemets, sans explication.";

  const user = `Conversation précédente:\n${transcript}\n\nNouvelle question: ${query}\n\nRequête de recherche autonome:`;

  try {
    const rewritten = await chatCompletion([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);
    const cleaned = rewritten.trim().replace(/^["']|["']$/g, "").split("\n")[0].trim();
    return cleaned || query;
  } catch (err) {
    console.warn("[RAG] query rewrite failed, falling back to raw query:", err);
    return query;
  }
}

export async function generateRecipe(request: ChatRequest): Promise<string> {
  const searchQuery = await rewriteQueryWithHistory(request.query, request.history || []);
  const chunks = await retrieveChunks(searchQuery, 5);
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
  const searchQuery = await rewriteQueryWithHistory(request.query, request.history || []);
  if (searchQuery !== request.query) {
    console.log(`[RAG] query rewrite: "${request.query}" → "${searchQuery}"`);
  }
  const chunks = await retrieveChunks(searchQuery, 5);
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
