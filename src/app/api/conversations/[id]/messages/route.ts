import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

// Récupérer les messages d'une conversation
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const convId = Number.parseInt(id);

  if (Number.isNaN(convId) || convId < 1) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const all = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json(all);
}
