/**
 * Integration tests that parse real Rimi receipts from the integration fixtures folder.
 *
 * NOTE: Rimi receipts are scanned image PDFs – text is extracted via OCR
 * (tesseract.js).  The RimiParser is not yet fully implemented, so these
 * tests are EXPECTED TO FAIL until the parser is complete.
 *
 * Covered PDFs:
 *   32-3261410  – 5 items (3 discounted), total 7.76 EUR
 *   33-3323479  – 4 items (3 discounted), total 12.89 EUR
 *   34-3423071  – 8 items (3 discounted), total 22.18 EUR
 *
 * Each describe block sets a generous timeout to accommodate OCR processing.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseReceiptPdf, isTextPdf } from "../../src/index";
import { Store, type Receipt } from "../../src/types";

const OCR_TIMEOUT = 120_000; // tesseract.js may be slow on first run

function datasetPath(filename: string): string {
  return join(__dirname, "fixtures", filename);
}

// ---------------------------------------------------------------------------
// Receipt 1 – 5 items (3 discounted), total 7.76 EUR
// ---------------------------------------------------------------------------
describe("RimiParser – 32-3261410 (5 items, 3 discounted)", () => {
  let receipt: Receipt;

  beforeAll(async () => {
    const buf = readFileSync(datasetPath("32-3261410.pdf"));
    const result = await parseReceiptPdf(buf);
    if (!result.success) throw new Error(result.error);
    receipt = result.receipt;
  }, OCR_TIMEOUT);

  it("PDF is image-based (requires OCR)", async () => {
    const buf = readFileSync(datasetPath("32-3261410.pdf"));
    expect(await isTextPdf(buf)).toBe(false);
  });

  it("detects store as Rimi", () => {
    expect(receipt.store).toBe(Store.Rimi);
  });

  it("parses total: 7.76 EUR", () => {
    expect(receipt.total).toBe(7.76);
  });

  it("parses purchase date (2025-07-19)", () => {
    expect(receipt.date?.getFullYear()).toBe(2025);
    expect(receipt.date?.getMonth()).toBe(6); // July (0-indexed)
    expect(receipt.date?.getDate()).toBe(19);
  });

  it("parses exactly 5 line items", () => {
    expect(receipt.items).toHaveLength(5);
  });

  it("parses Saldējums Tio plombīrs – full-price item (1 × 3.99 EUR)", () => {
    const item = receipt.items.find((i) => i.name.includes("plomb"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(3.99);
    expect(item!.quantity).toBe(1);
    expect(item!.totalPrice).toBe(3.99);
    expect(item!.discount).toBeUndefined();
  });

  it("parses Saldējums Milka Karameles – discounted (2.75 → 1.65, −1.10)", () => {
    const item = receipt.items.find((i) => i.name.includes("Milka"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(2.75);
    expect(item!.totalPrice).toBe(1.65);
    expect(item!.discount).toBe(1.1);
  });

  it("parses Banāni – weight-based item (0.532 kg × 1.39 EUR/kg)", () => {
    const item = receipt.items.find((i) => i.name.includes("Ban"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(1.39);
    expect(item!.quantity).toBe(0.532);
    expect(item!.totalPrice).toBe(0.74);
  });

  it("parses Šokolādes saldējums Tio – discounted (0.99 → 0.69, −0.30)", () => {
    const item = receipt.items.find(
      (i) => i.name.includes("Tio") && i.totalPrice === 0.69 && i.name.toLowerCase().includes("šok")
    );
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(0.99);
    expect(item!.totalPrice).toBe(0.69);
    expect(item!.discount).toBe(0.3);
  });

  it("parses Plombīra saldējums Tio – discounted (0.99 → 0.69, −0.30)", () => {
    const item = receipt.items.find(
      (i) => i.name.includes("Plomb") || (i.name.includes("Tio") && i.totalPrice === 0.69 && !i.name.toLowerCase().includes("šok"))
    );
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(0.99);
    expect(item!.totalPrice).toBe(0.69);
    expect(item!.discount).toBe(0.3);
  });
}, OCR_TIMEOUT);

// ---------------------------------------------------------------------------
// Receipt 2 – 4 items (3 discounted), total 12.89 EUR
// ---------------------------------------------------------------------------
describe("RimiParser – 33-3323479 (4 items, 3 discounted)", () => {
  let receipt: Receipt;

  beforeAll(async () => {
    const buf = readFileSync(datasetPath("33-3323479.pdf"));
    const result = await parseReceiptPdf(buf);
    if (!result.success) throw new Error(result.error);
    receipt = result.receipt;
  }, OCR_TIMEOUT);

  it("PDF is image-based (requires OCR)", async () => {
    const buf = readFileSync(datasetPath("33-3323479.pdf"));
    expect(await isTextPdf(buf)).toBe(false);
  });

  it("detects store as Rimi", () => {
    expect(receipt.store).toBe(Store.Rimi);
  });

  it("parses total: 12.89 EUR", () => {
    expect(receipt.total).toBe(12.89);
  });

  it("parses purchase date (2025-09-11)", () => {
    expect(receipt.date?.getFullYear()).toBe(2025);
    expect(receipt.date?.getMonth()).toBe(8); // September (0-indexed)
    expect(receipt.date?.getDate()).toBe(11);
  });

  it("parses exactly 4 line items", () => {
    expect(receipt.items).toHaveLength(4);
  });

  it("parses Atlantijas laša fileja – weight-based discounted item (22.99/kg, −4.44, 0.342 kg → 3.42)", () => {
    const item = receipt.items.find((i) => i.name.includes("laša"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(22.99);
    expect(item!.quantity).toBe(0.342);
    expect(item!.totalPrice).toBe(3.42);
    expect(item!.discount).toBeDefined();
  });

  it("parses Cīsiņi Vīnes – discounted (4.89 → 3.99, −0.90)", () => {
    const item = receipt.items.find((i) => i.name.includes("Vīnes"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(4.89);
    expect(item!.totalPrice).toBe(3.99);
    expect(item!.discount).toBe(0.9);
  });

  it("parses Rīsi Valdo Basmati – full-price item (1 × 3.89 EUR)", () => {
    const item = receipt.items.find((i) => i.name.includes("Basmati"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(3.89);
    expect(item!.quantity).toBe(1);
    expect(item!.totalPrice).toBe(3.89);
    expect(item!.discount).toBeUndefined();
  });

  it("parses Tomātu mērce Spilva – discounted (2.39 → 1.59, −0.80)", () => {
    const item = receipt.items.find((i) => i.name.includes("Spilva"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(2.39);
    expect(item!.totalPrice).toBe(1.59);
    expect(item!.discount).toBe(0.8);
  });
}, OCR_TIMEOUT);

// ---------------------------------------------------------------------------
// Receipt 3 – 8 items (3 discounted), total 22.18 EUR
// ---------------------------------------------------------------------------
describe("RimiParser – 34-3423071 (8 items, 3 discounted)", () => {
  let receipt: Receipt;

  beforeAll(async () => {
    const buf = readFileSync(datasetPath("34-3423071.pdf"));
    const result = await parseReceiptPdf(buf);
    if (!result.success) throw new Error(result.error);
    receipt = result.receipt;
  }, OCR_TIMEOUT);

  it("PDF is image-based (requires OCR)", async () => {
    const buf = readFileSync(datasetPath("34-3423071.pdf"));
    expect(await isTextPdf(buf)).toBe(false);
  });

  it("detects store as Rimi", () => {
    expect(receipt.store).toBe(Store.Rimi);
  });

  it("parses total: 22.18 EUR", () => {
    expect(receipt.total).toBe(22.18);
  });

  it("parses purchase date (2025-08-11)", () => {
    expect(receipt.date?.getFullYear()).toBe(2025);
    expect(receipt.date?.getMonth()).toBe(7); // August (0-indexed)
    expect(receipt.date?.getDate()).toBe(11);
  });

  it("parses exactly 8 line items", () => {
    expect(receipt.items).toHaveLength(8);
  });

  it("parses Konfektes Candyking – weight-based item (7.99/kg, 0.832 kg → 6.65)", () => {
    const item = receipt.items.find((i) => i.name.includes("Candyking"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(7.99);
    expect(item!.quantity).toBe(0.832);
    expect(item!.totalPrice).toBe(6.65);
    expect(item!.discount).toBeUndefined();
  });

  it("parses Vafeles Latvijas Maiznieks Sirds – discounted (2 × 1.99 → 3.38)", () => {
    const item = receipt.items.find((i) => i.name.includes("Maiznieks"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(2);
    expect(item!.totalPrice).toBe(3.38);
    expect(item!.discount).toBeDefined();
  });

  it("parses Cāļa maltā gaļa Rimi – full-price item (1 × 2.85 EUR)", () => {
    const item = receipt.items.find((i) => i.name.includes("maltā"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(2.85);
    expect(item!.quantity).toBe(1);
    expect(item!.totalPrice).toBe(2.85);
    expect(item!.discount).toBeUndefined();
  });
}, OCR_TIMEOUT);
