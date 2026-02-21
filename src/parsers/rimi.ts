import { Receipt, Store } from "../types";
import { ReceiptParser } from "./base";

/**
 * Parser for Rimi (Latvia) receipts.
 *
 * Typical Rimi receipt markers:
 *   - Header contains "RIMI" or "Rimi Latvia"
 *   - Items listed as: PRODUCT NAME  total
 *   - Quantity lines often separate: qty x price
 *   - Total line: "KOPĀ" or "SUMMA"
 */
export class RimiParser extends ReceiptParser {
  readonly store = Store.Rimi;

  matches(text: string): boolean {
    const upper = text.toUpperCase();
    return upper.includes("RIMI");
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
    // Rimi item pattern: name followed by price at end
    // e.g. "PIENA MAIZE 0,89 A"
    const itemPattern = /^(.+?)\s+(\d+[.,]\d{2})\s*[A-Z]?$/;
    const qtyPattern = /^(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+[.,]\d+)$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(itemPattern);
      if (match && !this.isMetadataLine(match[1])) {
        const name = match[1].trim();
        const totalPrice = this.parsePrice(match[2]);
        let quantity = 1;
        let unitPrice = totalPrice;

        // Check if next line is a quantity line
        if (i + 1 < lines.length) {
          const qtyMatch = lines[i + 1].match(qtyPattern);
          if (qtyMatch) {
            quantity = parseFloat(qtyMatch[1].replace(",", "."));
            unitPrice = this.parsePrice(qtyMatch[2]);
            i++; // skip the quantity line
          }
        }

        items.push(
          this.createItem({ name, quantity, unitPrice, totalPrice })
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
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      if (/iela|bulvāris|laukums|street|avenue/i.test(lines[i])) {
        return lines[i];
      }
    }
    return undefined;
  }

  private isMetadataLine(text: string): boolean {
    const metaKeywords = [
      "RIMI", "KOPĀ", "SUMMA", "TOTAL", "PVN", "KASE",
      "ČEKS", "DATUMS", "LAIKS",
    ];
    const upper = text.toUpperCase();
    return metaKeywords.some((kw) => upper.includes(kw));
  }
}
