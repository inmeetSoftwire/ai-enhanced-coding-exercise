const express = require('express');
const { ChromaClient } = require('chromadb');
const { OpenAIEmbeddingFunction } = require('@chroma-core/openai');

const router = express.Router();

const client = new ChromaClient();

const getCollection = async () => {
  const collection = await client.getOrCreateCollection({
    name: 'flashcards',
    embeddingFunction: new OpenAIEmbeddingFunction({
      modelName: 'text-embedding-3-small',
      apiKey: process.env.LLM_API_KEY,
    }),
  });
  return collection;
};

router.post('/index', async (req, res) => {
  try {
    const { deckId, cards, source } = req.body;
    if (!deckId || !Array.isArray(cards)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    const collection = await getCollection();
    const ids = cards.map((c) => c.id);
    const documents = cards.map((c) => `${c.question}\n${c.answer}`);
    const metadatas = cards.map((c) => ({
      cardId: c.id,
      deckId,
      question: c.question,
      answer: c.answer,
      source,
    }));
    await collection.add({ ids, documents, metadatas });
    return res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Indexing failed';
    return res.status(500).json({ error: message });
  }
});

router.delete('/decks/:deckId', async (req, res) => {
  try {
    const { deckId } = req.params;
    const collection = await getCollection();
    await collection.delete({ where: { deckId } });
    return res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    return res.status(500).json({ error: message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const k = typeof req.query.k === 'string' ? parseInt(req.query.k, 10) : 10;
    const deckId = typeof req.query.deckId === 'string' ? req.query.deckId : undefined;
    const exclude = typeof req.query.exclude === 'string' && req.query.exclude.length > 0
      ? req.query.exclude.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const collection = await getCollection();
    const where = deckId ? { deckId } : undefined;

    const result = await collection.query({
      queryTexts: [q],
      nResults: Number.isFinite(k) ? k : 10,
      where,
      include: ['metadatas', 'documents', 'distances'],
    });

    const metadatas = Array.isArray(result.metadatas) ? result.metadatas[0] : [];
    const cards = (metadatas || [])
      .map((m) => ({ id: m.cardId, question: m.question, answer: m.answer }))
      .filter((c) => {
        if (exclude.length === 0) return true;
        const hay = `${c.question} ${c.answer}`.toLowerCase();
        return exclude.every((t) => hay.includes(t) === false);
      });

    return res.json({ cards });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return res.status(500).json({ error: message });
  }
});

module.exports = router;
