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

  db.exec(`
    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_decks_name ON decks(name);
  `);

  dbInstance = db;
  return dbInstance;
}

module.exports = { getDb };
