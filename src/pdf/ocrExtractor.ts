import Tesseract from "tesseract.js";

/**
 * Perform OCR on a PDF that consists of scanned images.
 * Converts the buffer to an image and runs Tesseract recognition.
 *
 * @param buffer - The raw PDF / image buffer
 * @param language - Tesseract language code (default: "lav" for Latvian)
 * @returns Recognized text
 */
export async function extractTextWithOcr(
  buffer: Buffer,
  language = "lav"
): Promise<string> {
  const worker = await Tesseract.createWorker(language);
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text;
  } finally {
    await worker.terminate();
  }
}
