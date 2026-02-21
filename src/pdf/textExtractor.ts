import pdf from "pdf-parse";

/**
 * Extract text content from a text-based PDF buffer.
 * Returns the concatenated text of all pages.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  return data.text;
}

/**
 * Returns true when the PDF buffer contains meaningful extractable text.
 * Used to decide whether OCR is needed.
 */
export async function isTextPdf(buffer: Buffer): Promise<boolean> {
  const text = await extractTextFromPdf(buffer);
  // A PDF with only whitespace / very short text is likely image-only
  return text.trim().length > 20;
}
