import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { readFile } from "fs/promises";
import { join } from "path";
import { readdirSync } from "fs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bookId = Number.parseInt(id);

  if (Number.isNaN(bookId) || bookId < 1) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const [book] = await db
    .select()
    .from(books)
    .where(eq(books.id, bookId))
    .limit(1);

  if (!book) {
    return NextResponse.json({ error: "Livre non trouvé" }, { status: 404 });
  }

  // Trouver le fichier dans uploads/ (préfixé par timestamp)
  const uploadsDir = join(process.cwd(), "uploads");
  const files = readdirSync(uploadsDir);
  const match = files.find((f) => f.endsWith(book.filename));

  if (!match) {
    return NextResponse.json({ error: "Fichier non trouvé" }, { status: 404 });
  }

  // Vérifier que le fichier résolu reste dans uploads/
  const resolvedPath = join(uploadsDir, match);
  if (!resolvedPath.startsWith(uploadsDir)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const buffer = await readFile(resolvedPath);

  // Encoder le filename selon RFC 5987
  const encodedFilename = encodeURIComponent(book.filename).replaceAll("'", "%27");

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodedFilename}`,
    },
  });
}
