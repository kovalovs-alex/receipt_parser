/**
 * Integration tests that parse real Maxima receipts from the test-data folder.
 *
 * Covered PDFs (all text-based, no OCR required):
 *   2066-0141-4480-0511  – 2 items, no discounts
 *   2066-0250-1090-0474  – 5 items, 2 discounted
 *   2066-0201-8920-0368  – 7 items, 1 discounted, 3 weight-based
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseReceiptPdf } from "../src/index";
import { Store, type Receipt } from "../src/types";

function fixturePath(filename: string): string {
  return join(__dirname, "test-data", filename);
}

// ---------------------------------------------------------------------------
// Receipt 1 – two items, no discounts
// ---------------------------------------------------------------------------
describe("MaximaParser – 2066-0141-4480-0511 (2 items, no discounts)", () => {
  let receipt: Receipt;

  beforeAll(async () => {
    const buf = readFileSync(fixturePath("2066-0141-4480-0511.pdf"));
    const result = await parseReceiptPdf(buf);
    if (!result.success) throw new Error(result.error);
    receipt = result.receipt;
  });

  it("detects store as Maxima", () => {
    expect(receipt.store).toBe(Store.Maxima);
  });

  it("parses total: 4.38 EUR", () => {
    expect(receipt.total).toBe(4.38);
  });

  it("parses purchase date (2025-09-16)", () => {
    expect(receipt.date?.getFullYear()).toBe(2025);
    expect(receipt.date?.getMonth()).toBe(8); // September (0-indexed)
    expect(receipt.date?.getDate()).toBe(16);
  });

  it("parses exactly 2 line items", () => {
    expect(receipt.items).toHaveLength(2);
  });

  it("parses MARIA STRIP pregnancy test – simple item (1 × 1.89 EUR)", () => {
    const item = receipt.items.find((i) => i.name.includes("MARIA"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(1.89);
    expect(item!.totalPrice).toBe(1.89);
    expect(item!.discount).toBeUndefined();
  });

  it("parses Štricele ar kanēļa – simple item (1 × 2.49 EUR)", () => {
    const item = receipt.items.find((i) => i.name.includes("kanē"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(2.49);
    expect(item!.totalPrice).toBe(2.49);
    expect(item!.discount).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Receipt 2 – five items, two discounted
// ---------------------------------------------------------------------------
describe("MaximaParser – 2066-0250-1090-0474 (5 items, 2 discounted)", () => {
  let receipt: Receipt;

  beforeAll(async () => {
    const buf = readFileSync(fixturePath("2066-0250-1090-0474.pdf"));
    const result = await parseReceiptPdf(buf);
    if (!result.success) throw new Error(result.error);
    receipt = result.receipt;
  });

  it("detects store as Maxima", () => {
    expect(receipt.store).toBe(Store.Maxima);
  });

  it("parses total: 7.79 EUR", () => {
    expect(receipt.total).toBe(7.79);
  });

  it("parses purchase date (2025-08-13)", () => {
    expect(receipt.date?.getFullYear()).toBe(2025);
    expect(receipt.date?.getMonth()).toBe(7); // August (0-indexed)
    expect(receipt.date?.getDate()).toBe(13);
  });

  it("parses exactly 5 line items", () => {
    expect(receipt.items).toHaveLength(5);
  });

  it("parses Skābais krējums VALMIERA – discounted (2.25 → 1.99, −0.26)", () => {
    const item = receipt.items.find((i) => i.name.includes("VALMIERA"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(2.25);
    expect(item!.totalPrice).toBe(1.99);
    expect(item!.discount).toBe(0.26);
  });

  it("parses Biez. RŪDOLFS āb. ban. žāv. – discounted (1.52 → 1.19, −0.33)", () => {
    const item = receipt.items.find((i) => i.name.includes("žāv"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(1.52);
    expect(item!.totalPrice).toBe(1.19);
    expect(item!.discount).toBe(0.33);
  });

  it("parses BIO biez. RŪDOLFS bumb. ban. ērkšķ. – full-price item (1 × 1.56 EUR)", () => {
    const item = receipt.items.find((i) => i.name.includes("ērkšķ"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(1.56);
    expect(item!.totalPrice).toBe(1.56);
    expect(item!.discount).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Receipt 3 – seven items, one discounted, three weight-based
// ---------------------------------------------------------------------------
describe("MaximaParser – 2066-0201-8920-0368 (7 items, 1 discounted, weight-based)", () => {
  let receipt: Receipt;

  beforeAll(async () => {
    const buf = readFileSync(fixturePath("2066-0201-8920-0368.pdf"));
    const result = await parseReceiptPdf(buf);
    if (!result.success) throw new Error(result.error);
    receipt = result.receipt;
  });

  it("detects store as Maxima", () => {
    expect(receipt.store).toBe(Store.Maxima);
  });

  it("parses total: 7.58 EUR", () => {
    expect(receipt.total).toBe(7.58);
  });

  it("parses purchase date (2025-03-11)", () => {
    expect(receipt.date?.getFullYear()).toBe(2025);
    expect(receipt.date?.getMonth()).toBe(2); // March (0-indexed)
    expect(receipt.date?.getDate()).toBe(11);
  });

  it("parses exactly 7 line items", () => {
    expect(receipt.items).toHaveLength(7);
  });

  it("parses Skābais krējums EXPORTA – discounted (2.09 → 1.49, −0.60)", () => {
    const item = receipt.items.find((i) => i.name.includes("EXPORTA"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(2.09);
    expect(item!.totalPrice).toBe(1.49);
    expect(item!.discount).toBe(0.6);
  });

  it("parses Tomāti ķekaros – weight-based item (0.402 kg × 2.99 EUR/kg)", () => {
    const item = receipt.items.find((i) => i.name.includes("Tom"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(2.99);
    expect(item!.quantity).toBe(0.402);
    expect(item!.totalPrice).toBe(1.2);
    expect(item!.discount).toBeUndefined();
  });

  it("parses Kartupeļi dzeltenie – weight-based item (1.484 kg × 0.85 EUR/kg)", () => {
    const item = receipt.items.find((i) => i.name.includes("Kartu"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(0.85);
    expect(item!.quantity).toBe(1.484);
    expect(item!.totalPrice).toBe(1.26);
    expect(item!.discount).toBeUndefined();
  });

  it("parses Smalkmaizīte KANĒĻA COPĪTE – quantity 2 item (2 × 0.59 EUR)", () => {
    const item = receipt.items.find((i) => i.name.includes("COPĪTE"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(2);
    expect(item!.unitPrice).toBe(0.59);
    expect(item!.totalPrice).toBe(1.18);
    expect(item!.discount).toBeUndefined();
  });
});

