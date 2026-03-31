import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { books, chunks } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

export async function GET() {
  try {
    const allBooks = await db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        filename: books.filename,
        fileType: books.fileType,
        createdAt: books.createdAt,
        chunksCount: count(chunks.id),
      })
      .from(books)
      .leftJoin(chunks, eq(books.id, chunks.bookId))
      .groupBy(books.id)
      .orderBy(books.createdAt);

    return NextResponse.json(allBooks);
  } catch (error) {
    console.error("Books list error:", error);
    return NextResponse.json(
      { error: `Erreur: ${error}` },
      { status: 500 }
    );
  }
}
