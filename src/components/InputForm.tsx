import React, { useState, useEffect } from 'react';
import { extractFlashcards } from '../services/llmService';
import { fetchWikipediaContent } from '../services/wikipediaService';
import { FlashcardSet } from '../types';
import { getLLMConfig } from '../config';
import { MockModeToggle } from './MockModeToggle';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
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
    if (savedSetting) {
      setUseMockMode(savedSetting === 'true');
    }
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!input.trim()) {
      setError('Please enter a Wikipedia URL or text');
      return;
    }

    const config = getLLMConfig();
    
    if (!config.defaultApiKey || !config.defaultApiKey.trim()) {
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
        source: source,
        cards: flashcards,
        createdAt: new Date()
      });
    } catch (error) {
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  const isValidWikipediaUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.includes('wikipedia.org') && parsedUrl.pathname.length > 1;
    } catch {
      return false;
    }
  };

  const extractTitleFromUrl = (url: string): string => {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      return lastPart.replace(/_/g, ' ');
    } catch {
      return 'Wikipedia Flashcards';
    }
  };

  // Import helpers
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const onImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const data = JSON.parse(text);

      const toCards = (val: any): { question: string; answer: string }[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (Array.isArray(val.flashcards)) return val.flashcards;
        if (Array.isArray(val.cards)) return val.cards;
        return [];
      };

      const rawCards = toCards(data);
      if (!rawCards.length) {
        throw new Error('No flashcards found in JSON');
      }

      const cards = rawCards.map((c: any) => ({
        id: uuidv4(),
        question: String(c.question ?? ''),
        answer: String(c.answer ?? '')
      }));

      const titleFromFile = file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
      setFlashcardSet({
        title: data.title || `${titleFromFile}`,
        source: data.source || 'Imported JSON',
        cards,
        createdAt: new Date()
      });
    } catch (err: any) {
      setError(`Error importing JSON: ${err?.message || 'Invalid JSON format'}`);
    }
  };

  const parseCSV = (text: string): { question: string; answer: string }[] => {
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h: string) => h.trim().toLowerCase(),
    });

    // If headers are missing, Papa won't give us the fields we expect
    const fields: string[] = (result as any).meta?.fields || [];
    const hasQuestion = fields.some(f => f.toLowerCase() === 'question');
    const hasAnswer = fields.some(f => f.toLowerCase() === 'answer');
    if (!hasQuestion || !hasAnswer) return [];

    const rows = (result.data as any[]);
    const cards = rows
      .map(r => ({
        question: String(r.question ?? '').trim(),
        answer: String(r.answer ?? '').trim(),
      }))
      .filter(r => r.question.length > 0 || r.answer.length > 0);

    return cards;
  };

  const onImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const rawCards = parseCSV(text);
      if (!rawCards.length) {
        throw new Error('CSV must have headers "Question,Answer" and at least one row');
      }
      const cards = rawCards.map(c => ({ id: uuidv4(), question: c.question, answer: c.answer }));
      const titleFromFile = file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
      setFlashcardSet({
        title: `${titleFromFile}`,
        source: 'Imported CSV',
        cards,
        createdAt: new Date()
      });
    } catch (err: any) {
      setError(`Error importing CSV: ${err?.message || 'Invalid CSV format'}`);
    }
  };

  return (
    <div className="input-form-container">
      <form onSubmit={handleSubmit}>
        <div className="input-type-selector">
          <button
            type="button"
            className={isUrlInput ? 'active' : ''}
            onClick={() => setIsUrlInput(true)}
          >
            Wikipedia URL
          </button>
          <button
            type="button"
            className={!isUrlInput ? 'active' : ''}
            onClick={() => setIsUrlInput(false)}
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
            onChange={(e) => setInput(e.target.value)}
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
            type="file"
            accept="application/json,.json"
            onChange={onImportJSON}
            data-testid="import-json-input"
            style={{ display: 'none' }}
            id="import-json-input"
          />
          <input
            type="file"
            accept="text/csv,.csv"
            onChange={onImportCSV}
            data-testid="import-csv-input"
            style={{ display: 'none' }}
            id="import-csv-input"
          />
          <div className="import-buttons-row">
            <label htmlFor="import-json-input" className="import-btn">Import JSON</label>
            <label htmlFor="import-csv-input" className="import-btn">Import CSV</label>
          </div>
          <small>Import previously exported flashcards in JSON or CSV format.</small>
        </div>
        
        <button className="submit-button" type="submit">Generate Flashcards</button>
      </form>
    </div>
  );
};

export default InputForm;
