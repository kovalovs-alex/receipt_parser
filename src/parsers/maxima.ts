import { Receipt, Store } from "../types";
import { ReceiptParser } from "./base";

/**
 * Parser for Maxima (Latvia) text-based PDF receipts.
 *
 * Each item occupies three lines, with an optional two-line discount block:
 *
 *   Baltmaize Lielā galda Latvijā cepts 500g   ← product name
 *   1,59 X 1 gab.                              ← unitPrice X qty unit
 *   1,59 A                                     ← line total (before discount)
 *
 * Discounted item example:
 *   Skābais krējums EXPORTA 25% 360g
 *   2,09 X 1 gab.
 *   2,09 A
 *   Atlaide: (Cena ar atlaidi 1,59)            ← discounted final price
 *   -0,50 A                                    ← discount amount
 *
 * `totalPrice` on the returned ReceiptItem is always the **final price the
 * customer paid** (i.e. after any discount).
 */
export class MaximaParser extends ReceiptParser {
  readonly store = Store.Maxima;

  /** "1,59 X 1 gab."  or  "1,99 X 1,372 kg" */
  private static readonly QTY_PRICE = /^(\d+[.,]\d+)\s+X\s+(\d+(?:[.,]\d+)?)/i;
  /** "1,59 A"  or  "-0,50 B" – trailing letter is a tax-rate code, not significant */
  private static readonly AMOUNT_LINE = /^(-?\d+[.,]\d+)\s+[A-Z]$/i;
  /** "Atlaide: (Cena ar atlaidi 1,59)" */
  private static readonly DISCOUNT_LABEL =
    /^Atlaide:\s*\(Cena ar atlaidi\s+(\d+[.,]\d+)\)/i;
  /**
   * Real-PDF combined line: "3,19 X 1 gab. 3,19 A" or "1,99 X 1,372 kg 2,73 A"
   * unitPrice × qty unit total taxCode all on a single line (right-aligned PDF layout).
   */
  private static readonly QTY_PRICE_TOTAL =
    /^(\d+[.,]\d+)\s+X\s+(\d+(?:[.,]\d+)?)\s+\S+\s+(\d+[.,]\d+)\s+[A-Z]$/i;
  /**
   * Real-PDF combined discount line:
   * "Atlaide: (Cena ar atlaidi 1,99) -1,20 A"
   */
  private static readonly DISCOUNT_COMBINED =
    /^Atlaide:\s*\(Cena ar atlaidi\s+(\d+[.,]\d+)\)\s+(-?\d+[.,]\d+)\s+[A-Z]$/i;

  matches(text: string): boolean {
    return text.toUpperCase().includes("MAXIMA");
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

  private parseItems(lines: string[]) {
    const items = [];
    let i = 0;

    while (i < lines.length) {
      const next = lines[i + 1] ?? "";
      const afterNext = lines[i + 2] ?? "";

      // -- Case A: legacy 3-line format (name / qty×price / total) --
      // Used by hand-crafted test data; kept for full backward compatibility.
      if (
        MaximaParser.QTY_PRICE.test(next) &&
        MaximaParser.AMOUNT_LINE.test(afterNext)
      ) {
        const qtyMatch = next.match(MaximaParser.QTY_PRICE)!;
        const totalMatch = afterNext.match(MaximaParser.AMOUNT_LINE)!;

        const unitPrice = this.parsePrice(qtyMatch[1]);
        const quantity = this.parseQuantity(qtyMatch[2]);
        const lineTotal = this.parsePrice(totalMatch[1]);

        let finalPrice = lineTotal;
        let discount: number | undefined;
        let consumed = 3; // name + qty×price + total

        // Optional discount block immediately after the three item lines
        const discountCandidate = lines[i + 3] ?? "";
        const negCandidate = lines[i + 4] ?? "";

        if (MaximaParser.DISCOUNT_LABEL.test(discountCandidate)) {
          const dMatch = discountCandidate.match(MaximaParser.DISCOUNT_LABEL)!;
          finalPrice = this.parsePrice(dMatch[1]);
          consumed += 1;

          if (MaximaParser.AMOUNT_LINE.test(negCandidate)) {
            const negMatch = negCandidate.match(MaximaParser.AMOUNT_LINE)!;
            discount = Math.abs(this.parsePrice(negMatch[1]));
            consumed += 1;
          }
        }

        items.push(
          this.createItem({
            name: lines[i].trim(),
            quantity,
            unitPrice,
            totalPrice: finalPrice,
            ...(discount !== undefined ? { discount } : {}),
          })
        );

        i += consumed;
        continue;
      }

      // -- Case B: real-PDF 2-line format, 1-line name --
      // name / "unitPrice X qty unit total taxCode"
      if (MaximaParser.QTY_PRICE_TOTAL.test(next)) {
        const m = next.match(MaximaParser.QTY_PRICE_TOTAL)!;
        const unitPrice = this.parsePrice(m[1]);
        const quantity = this.parseQuantity(m[2]);
        const lineTotal = this.parsePrice(m[3]);

        let finalPrice = lineTotal;
        let discount: number | undefined;
        let consumed = 2; // name + combined line

        if (MaximaParser.DISCOUNT_COMBINED.test(afterNext)) {
          const dm = afterNext.match(MaximaParser.DISCOUNT_COMBINED)!;
          finalPrice = this.parsePrice(dm[1]);
          discount = Math.abs(this.parsePrice(dm[2]));
          consumed++;
        }

        items.push(
          this.createItem({
            name: lines[i].trim(),
            quantity,
            unitPrice,
            totalPrice: finalPrice,
            ...(discount !== undefined ? { discount } : {}),
          })
        );

        i += consumed;
        continue;
      }

      // -- Case C: real-PDF 2-line format, 2-line name --
      // name1 / name2 / "unitPrice X qty unit total taxCode"
      // Handles products whose name wraps to a second line (e.g. "BIO putra …\n110g").
      if (
        MaximaParser.QTY_PRICE_TOTAL.test(afterNext) &&
        this.isItemNameCandidate(lines[i]) &&
        this.isItemNameCandidate(next)
      ) {
        const name = `${lines[i]} ${next}`.trim();
        const m = afterNext.match(MaximaParser.QTY_PRICE_TOTAL)!;
        const unitPrice = this.parsePrice(m[1]);
        const quantity = this.parseQuantity(m[2]);
        const lineTotal = this.parsePrice(m[3]);

        let finalPrice = lineTotal;
        let discount: number | undefined;
        let consumed = 3; // name1 + name2 + combined line

        const discountCandidate = lines[i + 3] ?? "";
        if (MaximaParser.DISCOUNT_COMBINED.test(discountCandidate)) {
          const dm = discountCandidate.match(MaximaParser.DISCOUNT_COMBINED)!;
          finalPrice = this.parsePrice(dm[1]);
          discount = Math.abs(this.parsePrice(dm[2]));
          consumed++;
        }

        items.push(
          this.createItem({
            name,
            quantity,
            unitPrice,
            totalPrice: finalPrice,
            ...(discount !== undefined ? { discount } : {}),
          })
        );

        i += consumed;
        continue;
      }

      i++;
    }

    return items;
  }

  /**
   * Returns true when a line could be (part of) a product name.
   * Filters out known structural/metadata lines so that Case C does not
   * accidentally merge a receipt-header line with the first product name.
   */
  private isItemNameCandidate(line: string): boolean {
    if (!line || line.length < 2) return false;
    // Must contain at least one letter
    if (!/[a-zA-ZāčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ]/u.test(line)) return false;
    // Known structural keywords at line start
    if (
      /^(SIA|Veikals|Kase|Čeks|Juridiskā|PVN|Apmaksa|SUMMA|Kopā|Kop[aā]|Atlaide|TAVS|PALDIES|Kasieris|Nopelnīta|MAXIMA|Bankas|Master|Bezkontakta|Maksājumu|DOKUMENTA|KVĪTS|TERMINĀLA|TIRGOTĀJA|LAIKS|SAGLABĀJIET)/i.test(line)
    ) return false;
    if (/^={3,}|^-{3,}|^\.{3,}/.test(line)) return false;   // separator lines
    if (/^\d{4}-\d{2}-\d{2}/.test(line)) return false;       // date lines (ISO)
    if (/^#\d/.test(line)) return false;                      // receipt-number tag
    return true;
  }

  private parseTotal(lines: string[]): number {
    // Prefer "Kopā apmaksai" / "SUMMA apmaksai" which reflect the post-discount
    // amount actually charged. Scan from the end to pick up the last occurrence.
    for (let i = lines.length - 1; i >= 0; i--) {
      const m = lines[i].match(
        /(?:Kop[aā] apmaksai|SUMMA apmaksai|KOP[AĀ]|SUMMA)\s+(\d+[.,]\d+)/i
      );
      if (m) return this.parsePrice(m[1]);
    }
    return 0;
  }

  private parseDate(lines: string[]): Date | undefined {
    for (const line of lines) {
      // "17.09.2025 15:40:50" or "17/09/2025 15:40"
      const m = line.match(/(\d{2})[./](\d{2})[./](\d{4})\s+(\d{2}):(\d{2})/);
      if (m) {
        return new Date(
          parseInt(m[3]),
          parseInt(m[2]) - 1,
          parseInt(m[1]),
          parseInt(m[4]),
          parseInt(m[5])
        );
      }
    }
    return undefined;
  }

  private parseAddress(lines: string[]): string | undefined {
    for (let i = 0; i < Math.min(lines.length, 8); i++) {
      if (/iela|bulvāris|laukums|street|avenue/i.test(lines[i])) {
        return lines[i];
      }
    }
    return undefined;
  }
}
