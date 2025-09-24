import Papa from 'papaparse';

export type QA = { question: string; answer: string };

const normalizeHeader = (h: unknown): string => String(h ?? '').toLowerCase().trim();

export const parseCsvToQA = (csvText: string): QA[] => {
  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
    quoteChar: '"',
    escapeChar: '"',
  });

  const rows = parsed.data;
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => normalizeHeader(h));
  const hasHeader = header.includes('question') && header.includes('answer');
  const dataRows = hasHeader ? rows.slice(1) : rows;

  if (hasHeader) {
    const qIdx = header.indexOf('question');
    const aIdx = header.indexOf('answer');
    return dataRows
      .map((r) => ({ question: r[qIdx] ?? '', answer: r[aIdx] ?? '' }))
      .filter((x) => x.question.trim() !== '' || x.answer.trim() !== '');
  }

  return dataRows
    .map((r) => ({ question: r[0] ?? '', answer: r[1] ?? '' }))
    .filter((x) => x.question.trim() !== '' || x.answer.trim() !== '');
};
