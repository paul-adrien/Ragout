import { NextRequest } from "next/server";
import { streamRecipeWithSources } from "@/lib/rag/generator";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, constraints, lang, history, conversationId } = body;

    if (!query) {
      return Response.json({ error: "Requête vide" }, { status: 400 });
    }

    // Créer ou récupérer la conversation
    let convId: number = conversationId;
    if (!convId) {
      const title = query.length > 50 ? query.slice(0, 50) + "..." : query;
      const [conv] = await db
        .insert(conversations)
        .values({ title })
        .returning();
      convId = conv.id;
    }

    // Sauvegarder le message utilisateur
    await db.insert(messages).values({
      conversationId: convId,
      role: "user",
      content: query,
    });

    // Récupérer le stream + sources
    const { sources, stream } = await streamRecipeWithSources({ query, constraints, lang, history });

    const encoder = new TextEncoder();
    let fullResponse = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Envoyer les métadonnées en premier (convId + sources)
          const meta = JSON.stringify({ convId, sources });
          controller.enqueue(encoder.encode(`__META__${meta}__END_META__`));

          for await (const chunk of stream) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(chunk));
          }

          // Sauvegarder la réponse assistant
          await db.insert(messages).values({
            conversationId: convId,
            role: "assistant",
            content: fullResponse,
          });

          await db
            .update(conversations)
            .set({ updatedAt: new Date() })
            .where(eq(conversations.id, convId));

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return Response.json(
      { error: `Erreur chat: ${error}` },
      { status: 500 }
    );
  }
}
