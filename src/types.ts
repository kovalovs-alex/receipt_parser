/** Supported store chains */
export enum Store {
  Maxima = "MAXIMA",
  Rimi = "RIMI",
}

/** A single line item on a receipt */
export interface ReceiptItem {
  /** Product name as printed on the receipt */
  name: string;
  /** Quantity purchased */
  quantity: number;
  /** Unit price in EUR */
  unitPrice: number;
  /** Total price for this line item in EUR */
  totalPrice: number;
  /** Discount amount in EUR, if any */
  discount?: number;
}

/** A fully parsed receipt */
export interface Receipt {
  /** Which store chain issued the receipt */
  store: Store;
  /** Store address or location, if available */
  address?: string;
  /** Date and time of purchase */
  date?: Date;
  /** Individual line items */
  items: ReceiptItem[];
  /** Total amount paid in EUR */
  total: number;
  /** Raw text extracted from the receipt (for debugging / reprocessing) */
  rawText: string;
}

/** Options for the parse function */
export interface ParseOptions {
  /**
   * Hint which store the receipt is from.
   * If omitted the parser will attempt auto-detection.
   */
  store?: Store;
  /**
   * Language hint for OCR when processing image-based PDFs.
   * Defaults to "lav" (Latvian).
   */
  ocrLanguage?: string;
}

/** Result returned when parsing fails gracefully */
export interface ParseError {
  success: false;
  error: string;
}

/** Result returned on successful parse */
export interface ParseSuccess {
  success: true;
  receipt: Receipt;
}

/** Union result type */
export type ParseResult = ParseSuccess | ParseError;
