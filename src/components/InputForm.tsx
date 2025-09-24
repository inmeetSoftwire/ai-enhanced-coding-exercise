import React, { useState, useEffect } from 'react';

import { getLLMConfig } from '../config';
import { extractFlashcards } from '../services/llmService';
import { fetchWikipediaContent } from '../services/wikipediaService';
import { FlashcardSet } from '../types';

import { MockModeToggle } from './MockModeToggle';
import '../styles/InputForm.css';

interface InputFormProps {
  setFlashcardSet: React.Dispatch<React.SetStateAction<FlashcardSet | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const InputForm: React.FC<InputFormProps> = ({ setFlashcardSet, setLoading, setError }) => {
  const [isUrlInput, setIsUrlInput] = useState(true);
  const [input, setInput] = useState('');
  const [useMockMode, setUseMockMode] = useState(false);

  useEffect(() => {
    const savedSetting = localStorage.getItem('use_mock_mode');
    if (savedSetting !== null && savedSetting !== '') {
      setUseMockMode(savedSetting === 'true');
    }
  }, []);

  const isValidWikipediaUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return (
        parsedUrl.hostname === 'en.wikipedia.org'
        || parsedUrl.hostname === 'wikipedia.org'
      );
    } catch (error) {
      return false;
    }
  };

  const extractTitleFromUrl = (url: string): string => {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/');
      const title = pathParts[pathParts.length - 1];
      return title.replace(/_/g, ' ');
    } catch (error) {
      return 'Wikipedia Article';
    }
  };
  const readFileText = async (file: File): Promise<string> => {
    const reader = new FileReader();
    return new Promise<string>((resolve, reject): void => {
      reader.onload = (): void => resolve(String(reader.result));
      reader.onerror = (): void => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };
  const ensureIds = (
    cards: { id?: string; question: string; answer: string }[],
  ): { id: string; question: string; answer: string }[] => cards.map((c, idx) => ({
    id: c.id ?? `${Date.now()}_${idx}`,
    question: c.question,
    answer: c.answer,
  }));
  const handleImportJSON = async (file: File): Promise<void> => {
    setError(null);
    try {
      const text = await readFileText(file);
      const parsed = JSON.parse(text) as unknown;
      let title = 'Imported Flashcards';
      let source = 'Imported JSON';
      let cards: { id?: string; question: string; answer: string }[] = [];
      let createdAt: Date = new Date();
      if (Array.isArray(parsed)) {
        cards = parsed as { id?: string; question: string; answer: string }[];
      } else if (parsed !== null && typeof parsed === 'object') {
        const obj = parsed as Partial<FlashcardSet> & {
          cards?: { id?: string; question: string; answer: string }[]
        };
        if (typeof obj.title === 'string' && obj.title.trim() !== '') title = obj.title;
        if (typeof obj.source === 'string' && obj.source.trim() !== '') source = obj.source;
        if (Array.isArray(obj.cards)) cards = obj.cards;
        if (obj.createdAt instanceof Date) {
          createdAt = obj.createdAt;
        } else if (typeof (obj as { createdAt?: string }).createdAt === 'string') {
          createdAt = new Date((obj as { createdAt?: string }).createdAt as string);
        }
      }
      const normalizedCards = ensureIds(cards);
      setFlashcardSet({
        title,
        source,
        cards: normalizedCards,
        createdAt,
      });
    } catch (err) {
      setError('Failed to import JSON');
    }
  };
  const parseCSV = (csvText: string): { question: string; answer: string }[] => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines.length === 0) return [];
    const rows = lines.map((line) => {
      const cells: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '\\') {
          if (inQuotes === true && line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else {
            current += ch;
          }
        } else if (ch === '"') {
          if (inQuotes === true && line[i + 1] === '"') {
            current += '"';
            i += 1;
          } else if (inQuotes === true) {
            const next = line[i + 1];
            if (next === undefined || next === ',') {
              inQuotes = false;
            } else {
              current += '"';
            }
          } else {
            inQuotes = true;
          }
        } else if (ch === ',' && inQuotes === false) {
          cells.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      cells.push(current);
      return cells;
    });
    const header = rows[0].map((h) => h.toLowerCase());
    const hasHeader = header.includes('question') && header.includes('answer');
    const dataRows = hasHeader ? rows.slice(1) : rows;
    return dataRows.map((r) => {
      if (hasHeader) {
        const qIdx = header.indexOf('question');
        const aIdx = header.indexOf('answer');
        return { question: r[qIdx] ?? '', answer: r[aIdx] ?? '' };
      }
      return { question: r[0] ?? '', answer: r[1] ?? '' };
    }).filter((x) => x.question !== '' || x.answer !== '');
  };
  const handleImportCSV = async (file: File): Promise<void> => {
    setError(null);
    try {
      const text = await readFileText(file);
      const rows = parseCSV(text);
      const cards = ensureIds(rows);
      setFlashcardSet({
        title: 'Imported CSV Flashcards',
        source: 'Imported CSV',
        cards,
        createdAt: new Date(),
      });
    } catch (_) {
      setError('Failed to import CSV');
    }
  };
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!input.trim()) {
      setError('Please enter a Wikipedia URL or text');
      return;
    }

    const config = getLLMConfig();

    if (config.defaultApiKey === undefined || config.defaultApiKey === '' || config.defaultApiKey.trim() === '') {
      setError('Please set your API key in LLM Settings');
      return;
    }

    setLoading(true);

    try {
      let content = input;
      let source = 'Custom text';

      if (isUrlInput) {
        if (!isValidWikipediaUrl(input)) {
          setError('Please enter a valid Wikipedia URL');
          setLoading(false);
          return;
        }

        const wikiContent = await fetchWikipediaContent(input);
        content = wikiContent.content;
        source = input;
      }

      const flashcards = await extractFlashcards(content, undefined, useMockMode);

      setFlashcardSet({
        title: isUrlInput ? extractTitleFromUrl(input) : 'Custom Text Flashcards',
        source,
        cards: flashcards,
        createdAt: new Date(),
      });
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="input-form-container">
      <form
        onSubmit={(e): void => {
          handleSubmit(e).catch((_) => { /* Error handled in handleSubmit */ });
        }}
      >
        <div className="input-type-selector">
          <button
            type="button"
            className={isUrlInput === true ? 'active' : ''}
            onClick={(): void => setIsUrlInput(true)}
          >
            Wikipedia URL
          </button>
          <button
            type="button"
            className={isUrlInput === false ? 'active' : ''}
            onClick={(): void => setIsUrlInput(false)}
          >
            Custom Text
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="input">
            {isUrlInput ? 'Wikipedia URL' : 'Text to extract flashcards from'}
          </label>
          <textarea
            id="input"
            value={input}
            onChange={(e): void => setInput(e.target.value)}
            placeholder={
              isUrlInput
                ? 'https://en.wikipedia.org/wiki/Artificial_intelligence'
                : 'Paste your text here...'
            }
            rows={isUrlInput ? 1 : 10}
          />
        </div>

        <MockModeToggle onChange={setUseMockMode} />

        <div className="import-buttons">
          <input
            data-testid="import-json-input"
            id="import-json-input"
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e): void => {
              const f = e.target.files && e.target.files[0];
              if (f) {
                handleImportJSON(f).catch(() => {});
                e.currentTarget.value = '';
              }
            }}
          />
          <button
            type="button"
            className="import-button"
            onClick={(): void => {
              const el = document.getElementById('import-json-input') as HTMLInputElement | null;
              if (el) el.click();
            }}
          >
            Import JSON
          </button>

          <input
            data-testid="import-csv-input"
            id="import-csv-input"
            type="file"
            accept="text/csv,.csv"
            style={{ display: 'none' }}
            onChange={(e): void => {
              const f = e.target.files && e.target.files[0];
              if (f) {
                handleImportCSV(f).catch(() => {});
                e.currentTarget.value = '';
              }
            }}
          />
          <button
            type="button"
            className="import-button"
            onClick={(): void => {
              const el = document.getElementById('import-csv-input') as HTMLInputElement | null;
              if (el) el.click();
            }}
          >
            Import CSV
          </button>
        </div>

        <button className="submit-button" type="submit">Generate Flashcards</button>
      </form>
    </div>
  );
};

export default InputForm;
