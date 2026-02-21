declare module "pdf-parse" {
  interface PdfData {
    /** Number of pages */
    numpages: number;
    /** Number of rendered pages */
    numrender: number;
    /** PDF info */
    info: Record<string, unknown>;
    /** PDF metadata */
    metadata: unknown;
    /** PDF.js version */
    version: string;
    /** Extracted text content */
    text: string;
  }

  function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>
  ): Promise<PdfData>;

  export = pdfParse;
}
