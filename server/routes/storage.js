const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/connection');

const router = express.Router();
router.use(express.json());

router.get('/health', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(1) as count FROM decks').get();
    return res.json({ status: 'ok', deckCount: row.count });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

router.get('/decks', (req, res) => {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        'SELECT id, name, description, createdAt, updatedAt FROM decks ORDER BY createdAt DESC'
      )
      .all();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/decks', (req, res) => {
  const { name, description } = req.body || {};
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'name is required (string)' });
  }
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const id = uuidv4();
    db.prepare(
      'INSERT INTO decks (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)'
    ).run(id, name.trim(), description || null, now, now);
    const created = db
      .prepare('SELECT id, name, description, createdAt, updatedAt FROM decks WHERE id = ?')
      .get(id);
    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
