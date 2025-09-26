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

router.get('/decks/:deckId/cards', (req, res) => {
  const { deckId } = req.params;
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;
  const offsetRaw = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : 0;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 200 ? limitRaw : 50;
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;

  try {
    const db = getDb();
    if (q) {
      const stmt = db.prepare(
        'SELECT id, deckId, question, answer, metadata, createdAt, updatedAt FROM flashcards WHERE deckId = ? AND question LIKE ? ORDER BY createdAt DESC LIMIT ? OFFSET ?'
      );
      const rows = stmt.all(deckId, `%${q}%`, limit, offset);
      return res.json(rows);
    }
    const stmt = db.prepare(
      'SELECT id, deckId, question, answer, metadata, createdAt, updatedAt FROM flashcards WHERE deckId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?'
    );
    const rows = stmt.all(deckId, limit, offset);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/decks/:deckId/cards', (req, res) => {
  const { deckId } = req.params;
  const payload = req.body && Array.isArray(req.body.cards) ? req.body.cards : [];
  if (!Array.isArray(payload) || payload.length === 0) {
    return res.status(400).json({ message: 'cards array is required' });
  }
  const now = new Date().toISOString();

  try {
    const db = getDb();
    const insert = db.prepare(
      'INSERT INTO flashcards (id, deckId, question, answer, metadata, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const insertTx = db.transaction((cards) => {
      const created = [];
      for (const c of cards) {
        if (!c || typeof c.question !== 'string' || typeof c.answer !== 'string') {
          throw new Error('each card must have string question and answer');
        }
        const id = uuidv4();
        const metadata = c.metadata ? JSON.stringify(c.metadata) : null;
        insert.run(id, deckId, c.question.trim(), c.answer.trim(), metadata, now, now);
        created.push({ id, deckId, question: c.question.trim(), answer: c.answer.trim(), metadata, createdAt: now, updatedAt: now });
      }
      return created;
    });
    const createdCards = insertTx(payload);
    return res.status(201).json(createdCards);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
