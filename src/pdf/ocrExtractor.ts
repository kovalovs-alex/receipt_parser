import Tesseract from "tesseract.js";
import { execFileSync } from "child_process";
import { randomBytes } from "crypto";
import { tmpdir } from "os";
import { join } from "path";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";

/**
 * Returns true when the buffer starts with the PDF magic bytes (%PDF).
 */
function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.slice(0, 4).toString("ascii") === "%PDF";
}

/**
 * Convert the first page of a PDF buffer to a PNG image buffer using
 * `pdftoppm` (part of poppler-utils, available on most Linux systems).
 *
 * Throws a clear error when `pdftoppm` is not found on PATH.
 */
function pdfToImageBuffer(pdfBuffer: Buffer): Buffer {
  const id = randomBytes(8).toString("hex");
  const pdfPath = join(tmpdir(), `receipt_${id}.pdf`);
  const pngBase = join(tmpdir(), `receipt_${id}`);
  const pngPath = `${pngBase}-1.png`;

  try {
    writeFileSync(pdfPath, pdfBuffer);
    execFileSync("pdftoppm", ["-r", "200", "-png", "-l", "1", pdfPath, pngBase]);
    return readFileSync(pngPath);
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      throw new Error(
        "pdftoppm not found. Install poppler-utils (e.g. `apt install poppler-utils`) to enable OCR for image-based PDFs."
      );
    }
    throw err;
  } finally {
    if (existsSync(pdfPath)) unlinkSync(pdfPath);
    if (existsSync(pngPath)) unlinkSync(pngPath);
  }
}

/**
 * Apply post-OCR text corrections for known Tesseract confusion patterns
 * that appear consistently on Rimi/Latvian thermal-printer receipts.
 *
 * These are safe character substitutions that only affect product name
 * readability without touching numeric data:
 *
 *   m1 → ml  — "1" (digit one) misread as "l" (lowercase L) after a letter
 *               e.g. "465m1/406g" → "465ml/406g"
 *   B8J → B&J — "8" misread as "&" in the well-known brand token
 *
 * Deliberately minimal: corrections are only applied when the surrounding
 * context unambiguously matches the known error pattern.
 */
function postProcessOcrText(text: string): string {
  return text
    // "m1/" or "m1)" → "ml/" / "ml)" – unit suffix in product volumes
    .replace(/\bm1(?=[/)])/g, "ml")
    // Standalone "1" at end of volume token: "465m1" → "465ml"
    .replace(/(\d)m1\b/g, "$1ml")
    // "B8J" brand name
    .replace(/\bB8J\b/g, "B&J");
}

/**
 * Perform OCR on a PDF that consists of scanned images.
 * When given a PDF buffer it is first converted to a PNG image via
 * `pdftoppm` (first page only); the resulting image is then passed to
 * Tesseract for recognition.
 *
 * @param buffer   - Raw PDF or image buffer
 * @param language - Tesseract language code (default: "lav" for Latvian)
 * @returns Recognised text
 */
export async function extractTextWithOcr(
  buffer: Buffer,
  language = "lav"
): Promise<string> {
  const imageBuffer = isPdfBuffer(buffer) ? pdfToImageBuffer(buffer) : buffer;

  const worker = await Tesseract.createWorker(language);
  try {
    const {
      data: { text },
    } = await worker.recognize(imageBuffer);
    return postProcessOcrText(text);
  } finally {
    await worker.terminate();
  }
}
