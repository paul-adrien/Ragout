import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { ingestImage, NotARecipeError } from "@/lib/ingestion/image";
import { db } from "@/lib/db";
import { books } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 300; // 5 minutes (le vision LLM peut prendre du temps)

const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp"] as const;

export async function POST(request: NextRequest) {
  let filePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const safeName = file.name
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_")
      .slice(0, 200);

    const ext = safeName.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTS.includes(ext as typeof ALLOWED_EXTS[number])) {
      return NextResponse.json(
        { error: `Format non supporté. Utilisez ${ALLOWED_EXTS.join(", ")}.` },
        { status: 400 }
      );
    }

    // Doublon par filename
    const [existing] = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.filename, safeName))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Cette image est déjà dans la bibliothèque" },
        { status: 409 }
      );
    }

    const uploadsDir = join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });
    filePath = join(uploadsDir, `${Date.now()}-${safeName}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const result = await ingestImage(filePath, safeName);

    return NextResponse.json({
      message: "Recette extraite et ajoutée",
      bookId: result.bookId,
      title: result.title,
      chunksCount: 1,
    });
  } catch (error) {
    // Si l'image n'est pas une recette, on nettoie le fichier qu'on vient d'écrire
    if (error instanceof NotARecipeError && filePath) {
      await unlink(filePath).catch(() => {});
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("Image ingestion error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'extraction de la recette" },
      { status: 500 }
    );
  }
}
