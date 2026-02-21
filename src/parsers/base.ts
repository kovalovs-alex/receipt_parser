import { Receipt, ReceiptItem, Store } from "../types";

/**
 * Base class for store-specific receipt parsers.
 * Subclasses implement the concrete line-parsing logic.
 */
export abstract class ReceiptParser {
  abstract readonly store: Store;

  /**
   * Return true if the raw text looks like a receipt from this store.
   */
  abstract matches(text: string): boolean;

  /**
   * Parse raw receipt text into a structured Receipt object.
   */
  abstract parse(text: string): Receipt;

  /** Utility: trim and collapse whitespace */
  protected normalizeText(text: string): string {
    return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  }

  /** Utility: parse a price string like "1,23" or "1.23" into a number */
  protected parsePrice(raw: string): number {
    const cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "");
    const value = parseFloat(cleaned);
    return isNaN(value) ? 0 : Math.round(value * 100) / 100;
  }

  /** Utility: build a ReceiptItem with sensible defaults */
  protected createItem(
    partial: Partial<ReceiptItem> & { name: string; totalPrice: number }
  ): ReceiptItem {
    return {
      quantity: partial.quantity ?? 1,
      unitPrice: partial.unitPrice ?? partial.totalPrice,
      discount: partial.discount,
      ...partial,
    };
  }
}
