import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

  return NextResponse.json(book);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bookId = Number.parseInt(id);

  if (Number.isNaN(bookId) || bookId < 1) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  await db.delete(books).where(eq(books.id, bookId));

  return NextResponse.json({ ok: true });
}
