import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { issueReports, type ReportContextMessage } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

// Liste des signalements (du plus récent au plus ancien)
export async function GET() {
  const all = await db
    .select()
    .from(issueReports)
    .orderBy(desc(issueReports.createdAt));

  return NextResponse.json(all);
}

// Créer un signalement
export async function POST(request: NextRequest) {
  const body = await request.json();
  const description: string | undefined = body.description?.trim();
  const conversationId: number | null = body.conversationId ?? null;
  const contextMessages: ReportContextMessage[] = Array.isArray(body.contextMessages)
    ? body.contextMessages
    : [];

  if (!description) {
    return NextResponse.json({ error: "Description requise" }, { status: 400 });
  }

  const [report] = await db
    .insert(issueReports)
    .values({
      conversationId,
      description,
      contextMessages,
    })
    .returning();

  return NextResponse.json(report);
}
