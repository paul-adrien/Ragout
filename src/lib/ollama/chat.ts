const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "llama3";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama chat error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.message.content;
}

export async function* chatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama chat error: ${res.status} ${await res.text()}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value, { stream: true }).split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      const json = JSON.parse(line);
      if (json.message?.content) {
        yield json.message.content;
      }
    }
  }
}
