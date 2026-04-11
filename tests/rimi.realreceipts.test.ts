/**
 * Integration tests that parse real Rimi receipts from the test-data folder.
 *
 * NOTE: Rimi receipts are scanned image PDFs – text is extracted via OCR
 * (tesseract.js).
 *
 * Covered PDFs:
 *   31-3161026  – 4 items (2 discounted), total 8.21 EUR
 *   31-3166878  – 6 items (4 discounted, 1 weight-based), total 35.41 EUR
 *   34-3442129  – 9 items (4 discounted), total 24.36 EUR
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseReceiptPdf, isTextPdf } from "../src/index";
import { Store, type Receipt } from "../src/types";

const OCR_TIMEOUT = 120_000; // tesseract.js may be slow on first run

function fixturePath(filename: string): string {
  return join(__dirname, "test-data", filename);
}

// ---------------------------------------------------------------------------
// Receipt 1 – 4 items (2 discounted), total 8.21 EUR
// ---------------------------------------------------------------------------
describe("RimiParser – 31-3161026 (4 items, 2 discounted)", () => {
  let receipt: Receipt;

  beforeAll(async () => {
    const buf = readFileSync(fixturePath("31-3161026.pdf"));
    const result = await parseReceiptPdf(buf);
    if (!result.success) throw new Error(result.error);
    receipt = result.receipt;
  }, OCR_TIMEOUT);

  it("PDF is image-based (requires OCR)", async () => {
    const buf = readFileSync(fixturePath("31-3161026.pdf"));
    expect(await isTextPdf(buf)).toBe(false);
  });

  it("detects store as Rimi", () => {
    expect(receipt.store).toBe(Store.Rimi);
  });

  it("parses total: 8.21 EUR", () => {
    expect(receipt.total).toBe(8.21);
  });

  it("parses purchase date (2025-09-09)", () => {
    expect(receipt.date?.getFullYear()).toBe(2025);
    expect(receipt.date?.getMonth()).toBe(8); // September (0-indexed)
    expect(receipt.date?.getDate()).toBe(9);
  });

  it("parses exactly 4 line items", () => {
    expect(receipt.items).toHaveLength(4);
  });

  it("parses Groziņi Flora – full-price item (1 × 3.19 EUR)", () => {
    const item = receipt.items.find((i) => i.name.includes("Flora"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(3.19);
    expect(item!.totalPrice).toBe(3.19);
    expect(item!.discount).toBeUndefined();
  });

  it("parses Pistācijas Alis Co – heavily discounted (9.99 → 4.99, −5.00)", () => {
    const item = receipt.items.find((i) => i.name.includes("Pistā"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(9.99);
    expect(item!.totalPrice).toBe(4.99);
    expect(item!.discount).toBe(5.0);
  });
});

// ---------------------------------------------------------------------------
// Receipt 2 – 6 items (4 discounted, 1 weight-based), total 35.41 EUR
// ---------------------------------------------------------------------------
describe("RimiParser – 31-3166878 (6 items, 4 discounted, weight-based)", () => {
  let receipt: Receipt;

  beforeAll(async () => {
    const buf = readFileSync(fixturePath("31-3166878.pdf"));
    const result = await parseReceiptPdf(buf);
    if (!result.success) throw new Error(result.error);
    receipt = result.receipt;
  }, OCR_TIMEOUT);

  it("PDF is image-based (requires OCR)", async () => {
    const buf = readFileSync(fixturePath("31-3166878.pdf"));
    expect(await isTextPdf(buf)).toBe(false);
  });

  it("detects store as Rimi", () => {
    expect(receipt.store).toBe(Store.Rimi);
  });

  it("parses total: 35.41 EUR", () => {
    expect(receipt.total).toBe(35.41);
  });

  it("parses purchase date (2025-10-08)", () => {
    expect(receipt.date?.getFullYear()).toBe(2025);
    expect(receipt.date?.getMonth()).toBe(9); // October (0-indexed)
    expect(receipt.date?.getDate()).toBe(8);
  });

  it("parses exactly 6 line items", () => {
    expect(receipt.items).toHaveLength(6);
  });

  it("parses Piens Tere – full-price item (1 × 1.99 EUR)", () => {
    const item = receipt.items.find((i) => i.name.includes("Piens"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(1.99);
    expect(item!.totalPrice).toBe(1.99);
    expect(item!.discount).toBeUndefined();
  });

  it("parses Saldskābmaize Kuršu – discounted (1.29 → 1.05, −0.24)", () => {
    const item = receipt.items.find((i) => i.name.includes("Kur"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(1.29);
    expect(item!.totalPrice).toBe(1.05);
    expect(item!.discount).toBe(0.24);
  });

  it("parses Siers Tilzītes – weight-based discounted item (0.216 kg × 12.99 EUR/kg)", () => {
    const item = receipt.items.find((i) => i.name.includes("Tilz"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(12.99);
    expect(item!.quantity).toBe(0.216);
    expect(item!.totalPrice).toBe(1.94);
    expect(item!.discount).toBe(0.87);
  });
});

// ---------------------------------------------------------------------------
// Receipt 3 – 9 items (4 discounted), total 24.36 EUR
// ---------------------------------------------------------------------------
describe("RimiParser – 34-3442129 (9 items, 4 discounted)", () => {
  let receipt: Receipt;

  beforeAll(async () => {
    const buf = readFileSync(fixturePath("34-3442129.pdf"));
    const result = await parseReceiptPdf(buf);
    if (!result.success) throw new Error(result.error);
    receipt = result.receipt;
  }, OCR_TIMEOUT);

  it("PDF is image-based (requires OCR)", async () => {
    const buf = readFileSync(fixturePath("34-3442129.pdf"));
    expect(await isTextPdf(buf)).toBe(false);
  });

  it("detects store as Rimi", () => {
    expect(receipt.store).toBe(Store.Rimi);
  });

  it("parses total: 24.36 EUR", () => {
    expect(receipt.total).toBe(24.36);
  });

  it("parses purchase date (2025-08-03)", () => {
    expect(receipt.date?.getFullYear()).toBe(2025);
    expect(receipt.date?.getMonth()).toBe(7); // August (0-indexed)
    expect(receipt.date?.getDate()).toBe(3);
  });

  it("parses exactly 9 line items", () => {
    expect(receipt.items).toHaveLength(9);
  });

  it("parses Sulas dzēriens Cido – discounted (1.99 → 1.49, −0.50)", () => {
    const item = receipt.items.find((i) => i.name.includes("Cido"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(1.99);
    expect(item!.totalPrice).toBe(1.49);
    expect(item!.discount).toBe(0.5);
  });

  it("parses Suši izlase ar lasi – full-price item (1 × 9.99 EUR)", () => {
    const item = receipt.items.find((i) => i.name.includes("lasi"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(9.99);
    expect(item!.totalPrice).toBe(9.99);
    expect(item!.discount).toBeUndefined();
  });

  it("parses Ziedu pušķis – heavily discounted (9.99 → 4.99, −5.00)", () => {
    const item = receipt.items.find((i) => i.name.includes("Zied"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(9.99);
    expect(item!.totalPrice).toBe(4.99);
    expect(item!.discount).toBe(5.0);
  });
});
