import BetterSqlite3 from "better-sqlite3";
import path from "path";
import fs from "fs";
import { config } from "../config";

let db: ReturnType<typeof BetterSqlite3> | null = null;

export function initDB(): ReturnType<typeof BetterSqlite3> {
  if (db) return db;

  const dir = config.DATA_DIR;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new BetterSqlite3(path.join(dir, "budgetflow.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS budget_data (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      finance_data TEXT NOT NULL DEFAULT '{}',
      dark_mode INTEGER DEFAULT 0,
      currency TEXT DEFAULT '€',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
    INSERT OR IGNORE INTO schema_version (version) VALUES (1);
  `);

  if (!config.AUTH_ENABLED) {
    db.prepare(`
      INSERT OR IGNORE INTO users (id, username, email, password_hash)
      VALUES ('default', 'admin', 'admin@local', 'disabled')
    `).run();
  }

  return db;
}

export function getDB(): ReturnType<typeof BetterSqlite3> {
  if (!db) throw new Error("Database not initialized. Call initDB() first.");
  return db;
}