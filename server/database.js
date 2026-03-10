const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname);
const db = new Database(path.join(dbDir, 'sales_focus.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    client_type TEXT DEFAULT 'شركة',
    city TEXT DEFAULT 'الرياض',
    sector TEXT DEFAULT 'تجارة',
    channel TEXT DEFAULT 'أخرى',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    deal_name TEXT DEFAULT '',
    expected_value REAL DEFAULT 0,
    stage TEXT DEFAULT 'جديد',
    last_contact_date TEXT DEFAULT '',
    next_followup_date TEXT DEFAULT '',
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL UNIQUE,
    budget_score INTEGER DEFAULT 0,
    authority_score INTEGER DEFAULT 0,
    need_score INTEGER DEFAULT 0,
    timeline_score INTEGER DEFAULT 0,
    fit_score INTEGER DEFAULT 0,
    total_score INTEGER GENERATED ALWAYS AS (budget_score + authority_score + need_score + timeline_score + fit_score) STORED,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type_label TEXT DEFAULT 'أخرى',
    uploaded_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS meeting_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    client_idea TEXT NOT NULL,
    analysis_result TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS meeting_preps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    client_name TEXT DEFAULT '',
    sector TEXT DEFAULT '',
    meeting_date TEXT DEFAULT '',
    status TEXT DEFAULT 'مسودة',
    idea_raw TEXT DEFAULT '',
    analysis_result TEXT DEFAULT '{}',
    tags TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

try {
  db.exec('ALTER TABLE deals ADD COLUMN payment_percentage REAL DEFAULT 0.50;');
} catch (e) {
  // column already exists
}

try {
  db.exec('ALTER TABLE clients ADD COLUMN phone TEXT DEFAULT "";');
} catch (e) {
  // column already exists
}

module.exports = db;
