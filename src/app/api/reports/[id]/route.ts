import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { issueReports } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const VALID_STATUS = ["open", "blocked", "resolved", "archived"] as const;
type Status = (typeof VALID_STATUS)[number];

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw);
  return Number.isNaN(id) || id < 1 ? null : id;
}

// Détail d'un signalement
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reportId = parseId(id);
  if (reportId === null) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const [report] = await db
    .select()
    .from(issueReports)
    .where(eq(issueReports.id, reportId))
    .limit(1);

  if (!report) {
    return NextResponse.json({ error: "Signalement non trouvé" }, { status: 404 });
  }

  return NextResponse.json(report);
}

// Mise à jour du statut
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reportId = parseId(id);
  if (reportId === null) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const body = await request.json();
  const status = body.status as Status;
  if (!VALID_STATUS.includes(status)) {
    return NextResponse.json(
      { error: `Statut invalide (attendu: ${VALID_STATUS.join(", ")})` },
      { status: 400 }
    );
  }

  // resolvedAt renseigné automatiquement quand on passe à "resolved", remis à null sinon
  const resolvedAt = status === "resolved" ? new Date() : null;

  const [updated] = await db
    .update(issueReports)
    .set({ status, resolvedAt })
    .where(eq(issueReports.id, reportId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Signalement non trouvé" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// Suppression
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reportId = parseId(id);
  if (reportId === null) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  await db.delete(issueReports).where(eq(issueReports.id, reportId));
  return NextResponse.json({ ok: true });
}
