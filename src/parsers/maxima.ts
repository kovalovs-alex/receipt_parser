import { Receipt, Store } from "../types";
import { ReceiptParser } from "./base";

/**
 * Parser for Maxima (Latvia) receipts.
 *
 * Typical Maxima receipt markers:
 *   - Header contains "MAXIMA" or "Maxima Latvija"
 *   - Items listed as: PRODUCT NAME  qty x price  total
 *   - Total line: "KOPĀ" or "SUMMA"
 */
export class MaximaParser extends ReceiptParser {
  readonly store = Store.Maxima;

  matches(text: string): boolean {
    const upper = text.toUpperCase();
    return upper.includes("MAXIMA");
  }

  parse(text: string): Receipt {
    const normalized = this.normalizeText(text);
    const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);

    const items = this.parseItems(lines);
    const total = this.parseTotal(lines);
    const date = this.parseDate(lines);
    const address = this.parseAddress(lines);

    return {
      store: this.store,
      date,
      address,
      items,
      total,
      rawText: text,
    };
  }

  private parseItems(lines: string[]) {
    const items = [];
    // Maxima item pattern: name followed by quantity × unit price = total
    // e.g. "PIENA MAIZE 1 x 0,89 0,89"
    const itemPattern = /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+[.,]\d+)\s+(\d+[.,]\d+)$/;
    const simpleItemPattern = /^(.+?)\s+(\d+[.,]\d+)\s*$/;

    for (const line of lines) {
      let match = line.match(itemPattern);
      if (match) {
        items.push(
          this.createItem({
            name: match[1].trim(),
            quantity: parseFloat(match[2].replace(",", ".")),
            unitPrice: this.parsePrice(match[3]),
            totalPrice: this.parsePrice(match[4]),
          })
        );
        continue;
      }

      // Simple single-item line: NAME  PRICE
      match = line.match(simpleItemPattern);
      if (match && !this.isMetadataLine(match[1])) {
        items.push(
          this.createItem({
            name: match[1].trim(),
            totalPrice: this.parsePrice(match[2]),
          })
        );
      }
    }
    return items;
  }

  private parseTotal(lines: string[]): number {
    for (const line of lines) {
      const match = line.match(/(?:KOPĀ|SUMMA|TOTAL)\s+(\d+[.,]\d+)/i);
      if (match) {
        return this.parsePrice(match[1]);
      }
    }
    return 0;
  }

  private parseDate(lines: string[]): Date | undefined {
    for (const line of lines) {
      const match = line.match(/(\d{2})[./](\d{2})[./](\d{4})\s+(\d{2}):(\d{2})/);
      if (match) {
        return new Date(
          parseInt(match[3]),
          parseInt(match[2]) - 1,
          parseInt(match[1]),
          parseInt(match[4]),
          parseInt(match[5])
        );
      }
    }
    return undefined;
  }

  private parseAddress(lines: string[]): string | undefined {
    // Address typically appears after the store name, before items
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      if (/iela|bulvāris|laukums|street|avenue/i.test(lines[i])) {
        return lines[i];
      }
    }
    return undefined;
  }

  private isMetadataLine(text: string): boolean {
    const metaKeywords = [
      "MAXIMA", "KOPĀ", "SUMMA", "TOTAL", "PVN", "KASE",
      "ČEKS", "DATUMS", "LAIKS",
    ];
    const upper = text.toUpperCase();
    return metaKeywords.some((kw) => upper.includes(kw));
  }
}
