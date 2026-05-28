import { pgTable, serial, text, integer, timestamp, index, customType, jsonb } from "drizzle-orm/pg-core";

// Custom type pour pgvector
const vector = customType<{ data: number[]; driverParam: string }>({
  dataType() {
    return "vector(768)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === "string") return JSON.parse(value);
    return value as number[];
  },
});

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author"),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(), // 'epub' | 'pdf'
  createdAt: timestamp("created_at").defaultNow(),
});

export const chunks = pgTable(
  "chunks",
  {
    id: serial("id").primaryKey(),
    bookId: integer("book_id")
      .references(() => books.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),
    chapter: text("chapter"),
    page: integer("page"),
    chunkIndex: integer("chunk_index").notNull(),
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("chunks_embedding_idx").using("ivfflat", table.embedding.op("vector_cosine_ops")),
  ]
);

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export interface ReportContextMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    bookId: number;
    bookTitle: string;
    bookFilename: string;
    page: number | null;
    chapter: string | null;
  }>;
}

export const issueReports = pgTable("issue_reports", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, {
    onDelete: "set null",
  }),
  description: text("description").notNull(),
  // 'open' | 'blocked' | 'resolved' | 'archived'
  status: text("status").notNull().default("open"),
  // Snapshot figé des messages capturés au moment du signalement
  contextMessages: jsonb("context_messages").$type<ReportContextMessage[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});
