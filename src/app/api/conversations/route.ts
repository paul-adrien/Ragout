import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

// Liste des conversations
export async function GET() {
  const all = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.updatedAt));

  return NextResponse.json(all);
}

// Créer une nouvelle conversation
export async function POST(request: NextRequest) {
  const body = await request.json();
  const title = body.title || "Nouvelle conversation";

  const [conv] = await db
    .insert(conversations)
    .values({ title })
    .returning();

  return NextResponse.json(conv);
}
