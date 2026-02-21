# receipt-parser-lv

TypeScript library for parsing receipts from Latvian chain stores (**Maxima** and **Rimi**).
Supports both text-based and image (scanned) PDFs.

## Features

- **Text PDF extraction** – uses [pdf-parse](https://www.npmjs.com/package/pdf-parse) to pull text from standard PDFs
- **OCR for image PDFs** – uses [tesseract.js](https://www.npmjs.com/package/tesseract.js) when the PDF contains scanned images
- **Auto-detection** – automatically identifies which store the receipt belongs to
- **Structured output** – returns strongly-typed `Receipt` objects with items, totals, dates, etc.
- **Extensible** – abstract `ReceiptParser` base class makes it easy to add new stores

## Installation

```bash
npm install receipt-parser-lv
```

## Quick Start

```typescript
import { parseReceiptText, parseReceiptPdf, Store } from "receipt-parser-lv";

// Parse from text
const result = parseReceiptText(receiptText);
if (result.success) {
  console.log(result.receipt.store);  // Store.Maxima or Store.Rimi
  console.log(result.receipt.items);  // ReceiptItem[]
  console.log(result.receipt.total);  // number (EUR)
}

// Parse from PDF buffer
const pdfResult = await parseReceiptPdf(pdfBuffer);

// Provide a store hint if auto-detection fails
const hinted = parseReceiptText(text, { store: Store.Maxima });
```

## Architecture

| Library | Purpose |
|---------|---------|
| **pdf-parse** | Extract text from text-based PDFs |
| **tesseract.js** | OCR for image/scanned PDFs |
| **TypeScript** | Type safety and IDE support |
| **Vitest** | Unit testing |
| **ESLint** | Code linting |

### Project Structure

```
src/
  index.ts              Main entry point & public API
  types.ts              Shared types (Store, Receipt, ReceiptItem, etc.)
  parsers/
    base.ts             Abstract ReceiptParser base class
    maxima.ts           Maxima receipt parser
    rimi.ts             Rimi receipt parser
  pdf/
    textExtractor.ts    PDF text extraction via pdf-parse
    ocrExtractor.ts     OCR extraction via tesseract.js
tests/
  index.test.ts         Integration tests for the public API
  maxima.test.ts        Maxima parser unit tests
  rimi.test.ts          Rimi parser unit tests
  types.test.ts         Type tests
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## License

MIT
