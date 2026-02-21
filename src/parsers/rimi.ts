import { Receipt, Store } from "../types";
import { ReceiptParser } from "./base";

/**
 * Parser for Rimi (Latvia) receipts extracted via OCR from image-based PDFs.
 *
 * Real-OCR receipt structure
 * ──────────────────────────
 * Each item spans 2-3 lines in the OCR output:
 *
 *   Product name (may wrap to next line)      ← 1-2 name lines
 *   N gab X P,PP EUR T,TT A                  ← qty/price line (piece item)
 *   0,NNN kg X P,PP EUR/kg T,TT A            ← qty/price line (weight item)
 *   Atl. -D,DD Gala cena F,FF               ← optional discount line
 *
 * OCR routinely corrupts separators and the line total, so:
 *  - `unitPrice` is parsed with at most 2 decimal digits (strips OCR artefacts
 *    like "2,399" → 2.39).
 *  - `totalPrice` for undiscounted items is computed as qty × unitPrice.
 *  - `totalPrice` for discounted items comes from the "Gala cena" value.
 *  - `discount` is computed as (qty × unitPrice) − galaCena.
 *
 * Section markers
 * ───────────────
 *   Items start : the line immediately after "KLIENTS:" (loyalty card line)
 *   Items end   : "ATLAIDES:" / "KOPĀ:" / "Tavs ietaupījums" / "Maksājumu"
 */
export class RimiParser extends ReceiptParser {
  readonly store = Store.Rimi;

  // ── Qty/price line ──────────────────────────────────────────────────────
  // Handles leading OCR noise („, "), integer or decimal qty, dots used as
  // separators ("1.gab.X"), and stops at 2 decimal digits for unitPrice to
  // strip common 3-digit OCR corruption (e.g. "2,399" → 2.39).
  private static readonly QTY_PRICE =
    /^[^\d]*(\d+(?:[.,]\d+)?)[.\s]*(gab|kg)[.\s]*[Xx×*][.\s]*(\d+[.,]\d{1,2})/i;

  // Discount / final-price line – "Gala cena" is reliably OCR'd even when
  // the discount amount itself is garbled.
  private static readonly GALA_CENA = /Gala cena\s+(\d+[.,]\d+)/i;

  // ── Section / footer patterns ────────────────────────────────────────────
  private static readonly STOP_MARKER =
    /^ATLAIDES:|KOP[AĀ]:?|^Tavs ietaupījums|^Maksājumu|^Apmaksa/i;

  private static readonly TOTAL_LINE = /KOP[AĀ]:?\s+(\d+[.,]\d+)/i;

  private static readonly DATE_ISO = /(\d{4})-(\d{2})-(\d{2})/;
  private static readonly DATE_EU =
    /(\d{2})[./](\d{2})[./](\d{4})\s+(\d{2}):(\d{2})/;

  // ── Public API ───────────────────────────────────────────────────────────

  matches(text: string): boolean {
    return text.toUpperCase().includes("RIMI");
  }

  parse(text: string): Receipt {
    const normalized = this.normalizeText(text);
    const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);

    return {
      store: this.store,
      date: this.parseDate(lines),
      address: this.parseAddress(lines),
      items: this.parseItems(lines),
      total: this.parseTotal(lines),
      rawText: text,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private parseItems(lines: string[]) {
    const items = [];

    // Find the line after "KLIENTS:" to skip the receipt header.
    // Falls back to 0 when the loyalty-card line is absent (unit tests).
    let start = 0;
    for (let i = 0; i < lines.length; i++) {
      if (/KLIENTS:/i.test(lines[i])) {
        start = i + 1;
        break;
      }
    }

    let nameLines: string[] = [];

    for (let i = start; i < lines.length; i++) {
      const line = lines[i];

      if (RimiParser.STOP_MARKER.test(line)) break;

      const qtyMatch = line.match(RimiParser.QTY_PRICE);
      if (qtyMatch) {
        const name = nameLines.join(" ").trim();
        if (name) {
          const qty = this.parseQuantity(qtyMatch[1]);
          const unitPrice = this.parsePrice(qtyMatch[3]);
          // Prefer computing total from qty×unitPrice to avoid OCR-corrupted
          // totals printed on the receipt line.
          const lineTotal = Math.round(qty * unitPrice * 100) / 100;

          let finalPrice = lineTotal;
          let discount: number | undefined;

          // Check the very next line for a Gala cena discount
          if (i + 1 < lines.length) {
            const discMatch = lines[i + 1].match(RimiParser.GALA_CENA);
            if (discMatch) {
              finalPrice = this.parsePrice(discMatch[1]);
              discount = Math.round((lineTotal - finalPrice) * 100) / 100;
              i++; // consume the discount line
            }
          }

          items.push(
            this.createItem({
              name,
              quantity: qty,
              unitPrice,
              totalPrice: finalPrice,
              ...(discount !== undefined ? { discount } : {}),
            })
          );
        }
        nameLines = [];
      } else {
        nameLines.push(line);
      }
    }

    return items;
  }

  private parseTotal(lines: string[]): number {
    for (const line of lines) {
      const match = line.match(RimiParser.TOTAL_LINE);
      if (match) return this.parsePrice(match[1]);
    }
    return 0;
  }

  private parseDate(lines: string[]): Date | undefined {
    for (const line of lines) {
      // ISO format: YYYY-MM-DD (preferred – present in Rimi OCR footers)
      const iso = line.match(RimiParser.DATE_ISO);
      if (iso) {
        return new Date(
          parseInt(iso[1]),
          parseInt(iso[2]) - 1,
          parseInt(iso[3])
        );
      }
      // European fallback: DD.MM.YYYY HH:MM (kept for hand-crafted test data)
      const eu = line.match(RimiParser.DATE_EU);
      if (eu) {
        return new Date(
          parseInt(eu[3]),
          parseInt(eu[2]) - 1,
          parseInt(eu[1]),
          parseInt(eu[4]),
          parseInt(eu[5])
        );
      }
    }
    return undefined;
  }

  private parseAddress(lines: string[]): string | undefined {
    // Prefer the store-name line ("Rimi Super …") for human-readable location
    const storeLine = lines.find((l) =>
      /^Rimi\s+(Super|Hyper|Mini|Express|City)/i.test(l)
    );
    if (storeLine) return storeLine;

    // Fall back to the legal address line ("Jur. adrese: …")
    const addrLine = lines.find((l) => /Jur\.\s*adrese:/i.test(l));
    if (addrLine)
      return addrLine.replace(/.*Jur\.\s*adrese:\s*/i, "").trim();

    // Legacy: bare street address (unit test compatibility)
    const streetLine = lines.find((l) =>
      /iela|bulvāris|laukums|street|avenue/i.test(l)
    );
    return streetLine;
  }
}

