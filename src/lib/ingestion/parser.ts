import pdf from "pdf-parse";
import { readFile } from "fs/promises";

export interface ParsedSection {
  text: string;
  chapter?: string;
  page?: number;
}

export interface ParsedBook {
  sections: ParsedSection[];
  metadata: {
    title?: string;
    author?: string;
    pageCount?: number;
  };
}

export async function parsePDF(filePath: string): Promise<ParsedBook> {
  const buffer = await readFile(filePath);

  const sections: ParsedSection[] = [];
  let currentPage = 0;

  const data = await pdf(buffer, {
    pagerender(pageData: { getTextContent: () => Promise<{ items: { str: string; transform?: number[] }[] }> }) {
      currentPage++;
      return pageData.getTextContent().then((content) => {
        const pageText = content.items.map((item) => item.str).join(" ").replaceAll("\x00", "");
        if (pageText.trim().length > 20) {
          sections.push({ text: pageText.trim(), page: currentPage });
        }
        return pageText;
      });
    },
  });

  return {
    sections,
    metadata: {
      title: data.info?.Title?.replaceAll("\x00", "") || undefined,
      author: data.info?.Author?.replaceAll("\x00", "") || undefined,
      pageCount: data.numpages,
    },
  };
}

export async function parseEpub(filePath: string): Promise<ParsedBook> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);
  const { tmpdir } = await import("os");
  const { join } = await import("path");
  const { basename } = await import("path");
  const { mkdir: mkdirFs } = await import("fs/promises");

  const tmpDir = join(tmpdir(), `epub-${Date.now()}`);
  await mkdirFs(tmpDir, { recursive: true });
  await execFileAsync("unzip", ["-o", filePath, "-d", tmpDir]);

  const allFiles = await collectFiles(tmpDir);
  const htmlFiles = allFiles.filter((f) => /\.(xhtml|html|htm)$/i.test(f));
  htmlFiles.sort();

  const sections: ParsedSection[] = [];
  for (const file of htmlFiles) {
    const content = await readFile(file, "utf-8");

    // Extraire un titre de chapitre s'il y a un h1/h2/h3
    const titleMatch = content.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
    const chapter = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, "").trim()
      : basename(file, ".xhtml").replace(/[-_]/g, " ");

    const text = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .replaceAll("\x00", "")
      .trim();

    if (text.length > 50) {
      sections.push({ text, chapter: chapter || undefined });
    }
  }

  const { rm } = await import("fs/promises");
  await rm(tmpDir, { recursive: true, force: true });

  return { sections, metadata: {} };
}

async function collectFiles(dir: string): Promise<string[]> {
  const { readdir, stat } = await import("fs/promises");
  const { join } = await import("path");
  const entries = await readdir(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const s = await stat(fullPath);
    if (s.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

export async function parseBook(filePath: string, fileType: string): Promise<ParsedBook> {
  if (fileType === "pdf") return parsePDF(filePath);
  if (fileType === "epub") return parseEpub(filePath);
  throw new Error(`Type de fichier non supporté: ${fileType}`);
}
