import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
