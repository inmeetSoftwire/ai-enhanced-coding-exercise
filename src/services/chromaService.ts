import { ChromaClient } from 'chromadb';
import { OpenAIEmbeddingFunction } from '@chroma-core/openai';
import type { Collection } from 'chromadb';
import type { Flashcard } from '../types';

const client = new ChromaClient();

type ChromaMetadata = {
  cardId: string;
  deckId: string;
  question: string;
  answer: string;
  source?: string;
};

async function getCollection(): Promise<Collection> {
  const collection = await client.getOrCreateCollection({
    name: 'flashcards',
    embeddingFunction: new OpenAIEmbeddingFunction({
      modelName: 'text-embedding-3-small',
      apiKey: process.env.OPENAI_API_KEY,
    }),
  });
  return collection;
}

export async function indexCards(
  deckId: string,
  cards: Flashcard[],
  source?: string,
): Promise<void> {
  const collection = await getCollection();
  const ids = cards.map((c) => c.id);
  const documents = cards.map((c) => `${c.question}\n${c.answer}`);
  const metadatas: ChromaMetadata[] = cards.map((c) => ({
    cardId: c.id,
    deckId,
    question: c.question,
    answer: c.answer,
    source,
  }));
  await collection.add({ ids, documents, metadatas });
}

export async function removeDeck(deckId: string): Promise<void> {
  const collection = await getCollection();
  await collection.delete({ where: { deckId } });
}

export async function searchFlashcards(
  query: string,
  k: number = 10,
  opts?: { deckId?: string; exclude?: string[] },
): Promise<Flashcard[]> {
  const collection = await getCollection();
  const where = opts?.deckId !== undefined ? { deckId: opts.deckId } : undefined;

  const result = await collection.query({
    queryTexts: [query],
    nResults: k,
    where,
    include: ['metadatas', 'documents', 'distances'],
  });

  const metadatas = result.metadatas?.[0] as ChromaMetadata[] | undefined;
  if (metadatas === undefined) {
    return [];
  }

  const exclude = (opts?.exclude ?? []).map((e) => e.toLowerCase());

  const cards = metadatas
    .map<Flashcard>((m) => ({ id: m.cardId, question: m.question, answer: m.answer }))
    .filter((c) => {
      if (exclude.length === 0) return true;
      const hay = `${c.question} ${c.answer}`.toLowerCase();
      return exclude.every((term) => hay.includes(term) === false);
    });

  return cards;
}

export default getCollection;
