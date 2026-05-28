CREATE TABLE "issue_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"context_messages" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "issue_reports" ADD CONSTRAINT "issue_reports_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;