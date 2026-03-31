import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { ingestBook } from "@/lib/ingestion/pipeline";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 300; // 5 minutes max pour l'ingestion

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // Sanitize filename : garder uniquement alphanum, tirets, underscores, points
    const safeName = file.name
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // retirer accents
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_")
      .slice(0, 200); // limiter la longueur

    const ext = safeName.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "epub"].includes(ext)) {
      return NextResponse.json(
        { error: "Format non supporté. Utilisez PDF ou EPUB." },
        { status: 400 }
      );
    }

    // Vérifier si le livre existe déjà
    const [existing] = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.filename, safeName))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Ce livre est déjà dans la bibliothèque" },
        { status: 409 }
      );
    }

    // Sauvegarder le fichier
    const uploadsDir = join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const filePath = join(uploadsDir, `${Date.now()}-${safeName}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Lancer l'ingestion
    const result = await ingestBook(filePath, safeName, ext);

    return NextResponse.json({
      message: `Livre ingéré avec succès`,
      bookId: result.bookId,
      chunksCount: result.chunksCount,
    });
  } catch (error) {
    console.error("Ingestion error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ingestion du livre" },
      { status: 500 }
    );
  }
}
