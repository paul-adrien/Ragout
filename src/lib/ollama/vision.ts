const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || "llama3.2-vision";

/**
 * Envoie une image (buffer) + un prompt à un modèle vision Ollama et retourne
 * le texte généré. L'image est encodée en base64 (sans préfixe data URI).
 */
export async function analyzeImage(imageBuffer: Buffer, prompt: string): Promise<string> {
  const base64 = imageBuffer.toString("base64");

  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: VISION_MODEL,
      prompt,
      stream: false,
      images: [base64],
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama vision error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.response;
}
