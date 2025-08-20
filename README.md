# Flashcard Extractor

A TypeScript React application that extracts flashcards from Wikipedia articles or custom text using OpenAI's API. Pre-requisites: Node.js and npm (v23.11.0).

## Setup

1. Install dependencies: `npm install`
2. Set up environment: Copy `template.env` to `.env` and add your API keys
3. Start development: `npm run dev`

## Running the app

Open your browser and navigate to `http://localhost:3000` (opens automatically)

## Usage

1. Enter a Wikipedia URL or custom text
2. Toggle mock mode if needed
3. Click "Generate Flashcards"
4. View cards in card/list view
5. Export as CSV or JSON

## Testing the app

- Run tests: `npm test`
- Coverage report: `npm test -- --coverage`
- Run specific test: `npm test -- [test-file-path]`

## Fast Mock Mode toggle

Enables pre-defined responses without API calls for faster development and testing. Toggle the switch in the UI before generating flashcards.
