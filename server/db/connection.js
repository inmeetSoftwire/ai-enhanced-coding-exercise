const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let dbInstance;

function getDb() {
  if (dbInstance) return dbInstance;

  const storageDir = path.join(__dirname, '..', 'storage');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const dbPath = path.join(storageDir, 'database.sqlite');
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 3000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_decks_name ON decks(name);

    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      deckId TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      metadata TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(deckId) REFERENCES decks(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_flashcards_deck ON flashcards(deckId);
    CREATE INDEX IF NOT EXISTS idx_flashcards_question ON flashcards(question);
  `);

  dbInstance = db;
  return dbInstance;
}

module.exports = { getDb };
