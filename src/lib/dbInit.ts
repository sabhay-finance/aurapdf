import { PrismaClient } from '@prisma/client';

/**
 * Ensures that all necessary tables and default data exist.
 * This runs automatically on serverless cold starts (e.g. Vercel /tmp/dev.db)
 * so the database is always initialized without manual migrations or external DB setup.
 */
export async function ensureDatabaseTables(client: PrismaClient): Promise<void> {
  try {
    // Probe if the primary documents table already exists
    await client.$queryRaw`SELECT 1 FROM "documents" LIMIT 1`;
    return;
  } catch {
    // Database is fresh or uninitialized: create schema tables
  }

  console.log('📦 AuraPDF: Initializing serverless database schema...');

  const statements = [
    `CREATE TABLE IF NOT EXISTS "users" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT UNIQUE,
      "email_verified" DATETIME,
      "name" TEXT,
      "image" TEXT,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS "documents" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "file_url" TEXT NOT NULL,
      "file_size" INTEGER NOT NULL DEFAULT 0,
      "page_count" INTEGER NOT NULL DEFAULT 0,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL,
      "last_opened_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "last_page" INTEGER NOT NULL DEFAULT 1,
      "is_favorite" BOOLEAN NOT NULL DEFAULT 0,
      "folder" TEXT DEFAULT 'General',
      CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "document_pages" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "document_id" TEXT NOT NULL,
      "page_number" INTEGER NOT NULL,
      "text" TEXT NOT NULL,
      "width" REAL NOT NULL DEFAULT 612,
      "height" REAL NOT NULL DEFAULT 792,
      CONSTRAINT "document_pages_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "document_chunks" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "document_id" TEXT NOT NULL,
      "page_number" INTEGER NOT NULL,
      "section" TEXT,
      "chunk_index" INTEGER NOT NULL,
      "text" TEXT NOT NULL,
      "embedding" TEXT,
      CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "annotations" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "document_id" TEXT NOT NULL,
      "user_id" TEXT NOT NULL,
      "page_number" INTEGER NOT NULL,
      "type" TEXT NOT NULL,
      "coordinates" TEXT NOT NULL,
      "content" TEXT,
      "color" TEXT NOT NULL DEFAULT 'rgba(255, 235, 59, 0.3)',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL,
      CONSTRAINT "annotations_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "annotations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "notes" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "document_id" TEXT NOT NULL,
      "page_number" INTEGER NOT NULL,
      "selected_text" TEXT,
      "content" TEXT NOT NULL,
      "coordinates" TEXT,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL,
      CONSTRAINT "notes_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "flashcards" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "document_id" TEXT NOT NULL,
      "source_page" INTEGER NOT NULL,
      "question" TEXT NOT NULL,
      "answer" TEXT NOT NULL,
      "difficulty" INTEGER NOT NULL DEFAULT 0,
      "next_review_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "review_count" INTEGER NOT NULL DEFAULT 0,
      "interval_days" REAL NOT NULL DEFAULT 1,
      "ease_factor" REAL NOT NULL DEFAULT 2.5,
      "source_text" TEXT,
      "tags" TEXT,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "flashcards_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "flashcards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "questions" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "document_id" TEXT NOT NULL,
      "source_page" INTEGER NOT NULL,
      "topic" TEXT NOT NULL,
      "question" TEXT NOT NULL,
      "options" TEXT NOT NULL,
      "correct_answer" TEXT NOT NULL,
      "explanation" TEXT NOT NULL,
      "difficulty" TEXT NOT NULL DEFAULT 'standard',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "questions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "attempts" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "question_id" TEXT NOT NULL,
      "selected_answer" TEXT NOT NULL,
      "correct" BOOLEAN NOT NULL,
      "time_taken" INTEGER NOT NULL DEFAULT 0,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "study_sessions" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "document_id" TEXT NOT NULL,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "ended_at" DATETIME,
      "pages_read" INTEGER NOT NULL DEFAULT 0,
      "duration_seconds" INTEGER NOT NULL DEFAULT 0,
      "questions_done" INTEGER NOT NULL DEFAULT 0,
      "flashcards_done" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "study_sessions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "topics" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "document_id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      CONSTRAINT "topics_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "user_topic_stats" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "topic_id" TEXT NOT NULL,
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "correct" INTEGER NOT NULL DEFAULT 0,
      "incorrect" INTEGER NOT NULL DEFAULT 0,
      "confidence_score" REAL NOT NULL DEFAULT 0.0,
      CONSTRAINT "user_topic_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "user_topic_stats_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "document_pages_document_id_page_number_key" ON "document_pages"("document_id", "page_number");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "topics_document_id_name_key" ON "topics"("document_id", "name");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "user_topic_stats_user_id_topic_id_key" ON "user_topic_stats"("user_id", "topic_id");`
  ];

  for (const stmt of statements) {
    try {
      await client.$executeRawUnsafe(stmt);
    } catch (e) {
      // ignore
    }
  }

  // Seed default user and sample study module
  try {
    const user = await client.user.upsert({
      where: { id: 'demo-user-id' },
      update: {},
      create: {
        id: 'demo-user-id',
        email: 'student@aura.study',
        name: 'Alex Vance',
      },
    });

    await client.document.upsert({
      where: { id: 'cfa-equity-valuation' },
      update: {},
      create: {
        id: 'cfa-equity-valuation',
        user_id: user.id,
        title: 'Equity Valuation & Financial Analysis (CFA Level I)',
        file_url: '/samples/equity_valuation.pdf',
        file_size: 11200,
        page_count: 8,
        last_page: 1,
        is_favorite: true,
        folder: 'CFA Exam Prep',
      },
    });

    console.log('✅ AuraPDF: Serverless database schema and sample documents seeded successfully.');
  } catch (err: any) {
    console.warn('Notice during serverless seeding:', err?.message || err);
  }
}
