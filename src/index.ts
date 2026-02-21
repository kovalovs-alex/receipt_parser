import { extractTextFromPdf, isTextPdf } from "./pdf/textExtractor";
import { extractTextWithOcr } from "./pdf/ocrExtractor";
import { MaximaParser } from "./parsers/maxima";
import { RimiParser } from "./parsers/rimi";
import { ReceiptParser } from "./parsers/base";
import { ParseOptions, ParseResult, Store } from "./types";

const parsers: ReceiptParser[] = [new MaximaParser(), new RimiParser()];

/**
 * Detect which store a receipt belongs to based on its text content.
 */
export function detectStore(text: string): Store | undefined {
  for (const parser of parsers) {
    if (parser.matches(text)) {
      return parser.store;
    }
  }
  return undefined;
}

/**
 * Parse receipt text that has already been extracted from a PDF or provided directly.
 */
export function parseReceiptText(
  text: string,
  options: ParseOptions = {}
): ParseResult {
  try {
    const store = options.store ?? detectStore(text);
    if (!store) {
      return {
        success: false,
        error:
          "Unable to detect store. Provide a store hint via options.store or ensure the receipt text contains store identifiers.",
      };
    }

    const parser = parsers.find((p) => p.store === store);
    if (!parser) {
      return { success: false, error: `No parser available for store: ${store}` };
    }

    const receipt = parser.parse(text);
    return { success: true, receipt };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Parse a receipt from a PDF buffer.
 * Automatically detects whether the PDF contains text or needs OCR.
 */
export async function parseReceiptPdf(
  pdfBuffer: Buffer,
  options: ParseOptions = {}
): Promise<ParseResult> {
  try {
    let text: string;

    if (await isTextPdf(pdfBuffer)) {
      text = await extractTextFromPdf(pdfBuffer);
    } else {
      const lang = options.ocrLanguage ?? "lav";
      text = await extractTextWithOcr(pdfBuffer, lang);
    }

    return parseReceiptText(text, options);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Re-export all public types and classes
export { Store, type Receipt, type ReceiptItem, type ParseOptions, type ParseResult, type ParseSuccess, type ParseError } from "./types";
export { ReceiptParser } from "./parsers/base";
export { MaximaParser } from "./parsers/maxima";
export { RimiParser } from "./parsers/rimi";
export { extractTextFromPdf, isTextPdf } from "./pdf/textExtractor";
export { extractTextWithOcr } from "./pdf/ocrExtractor";
