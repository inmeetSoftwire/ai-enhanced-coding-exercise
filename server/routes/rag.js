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
    const metadatas = cards.map(() => ({
      deckId,
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
    const searchQuery = req.query.q || '';
    if (!searchQuery.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const maxResults = parseInt(req.query.k) || 10;
    const deckId = typeof req.query.deckId === 'string' ? req.query.deckId : undefined;
    const exclude = typeof req.query.exclude === 'string' && req.query.exclude.length > 0
      ? req.query.exclude.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const collection = await getCollection();
    const where = deckId ? { deckId } : undefined;

    const result = await collection.query({
      queryTexts: [searchQuery],
      nResults: maxResults,
      where,
      include: ['metadatas', 'documents', 'distances'],
    });

    const metadatas = Array.isArray(result.metadatas) ? result.metadatas[0] : [];
    const documents = Array.isArray(result.documents) ? result.documents[0] : [];
    const distances = Array.isArray(result.distances) ? result.distances[0] : [];
    const ids = Array.isArray(result.ids) ? result.ids[0] : [];

    const pairs = metadatas.map((m, i) => {
      const document = documents[i];
      const [question, answer] = document.split('\n');
      return {
        m,
        id: ids[i],
        question,
        answer,
        distance: distances[i],
      };
    });

    pairs.sort((a, b) => a.distance - b.distance);

    const filtered = pairs.filter(({ question, answer }) => {
      if (exclude.length === 0) return true;
      const cardInfoToCheck = `${question}\n${answer}`.toLowerCase();
      return exclude.every((t) => cardInfoToCheck.includes(t) === false);
    });

    const cards = filtered.map(({ id, question, answer }) => ({ id, question, answer }));

    return res.json({ cards });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return res.status(500).json({ error: message });
  }
});

module.exports = router;
