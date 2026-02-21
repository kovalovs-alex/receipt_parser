/**
 * Integration tests that parse real Maxima receipts from the dataset folder.
 *
 * Covered PDFs (all text-based, no OCR required):
 *   2022-0020-5300-6116  – 2 items, weight-based item, no discounts
 *   2022-0030-5970-4670  – 3 items, 1 discounted item
 *   2066-0130-0910-0264  – 6 items, 2 discounted, product name wraps to 2 lines
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseReceiptPdf } from "../src/index";
import { Store, type Receipt } from "../src/types";

function datasetPath(filename: string): string {
  return join(__dirname, "../dataset", filename);
}

// ---------------------------------------------------------------------------
// Receipt 1 – two items, weight-based, no discounts
// ---------------------------------------------------------------------------
describe("MaximaParser – 2022-0020-5300-6116 (2 items, weight-based)", () => {
  let receipt: Receipt;

  beforeAll(async () => {
    const buf = readFileSync(datasetPath("2022-0020-5300-6116.pdf"));
    const result = await parseReceiptPdf(buf);
    if (!result.success) throw new Error(result.error);
    receipt = result.receipt;
  });

  it("detects store as Maxima", () => {
    expect(receipt.store).toBe(Store.Maxima);
  });

  it("parses total: 7.91 EUR", () => {
    expect(receipt.total).toBe(7.91);
  });

  it("parses purchase date (2025-09-11)", () => {
    expect(receipt.date?.getFullYear()).toBe(2025);
    expect(receipt.date?.getMonth()).toBe(8); // September (0-indexed)
    expect(receipt.date?.getDate()).toBe(11);
  });

  it("parses exactly 2 line items", () => {
    expect(receipt.items).toHaveLength(2);
  });

  it("parses Apelsīni – weight-based item (1.372 kg × 1.99 EUR/kg)", () => {
    const item = receipt.items.find((i) => i.name.includes("Apels"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(1.99);
    expect(item!.quantity).toBe(1.372);
    expect(item!.totalPrice).toBe(2.73);
    expect(item!.discount).toBeUndefined();
  });

  it("parses MILKA – quantity 2 item", () => {
    const item = receipt.items.find((i) => i.name.includes("MILKA"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(2.59);
    expect(item!.quantity).toBe(2);
    expect(item!.totalPrice).toBe(5.18);
    expect(item!.discount).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Receipt 2 – three items, one discounted
// ---------------------------------------------------------------------------
describe("MaximaParser – 2022-0030-5970-4670 (3 items, 1 discounted)", () => {
  let receipt: Receipt;

  beforeAll(async () => {
    const buf = readFileSync(datasetPath("2022-0030-5970-4670.pdf"));
    const result = await parseReceiptPdf(buf);
    if (!result.success) throw new Error(result.error);
    receipt = result.receipt;
  });

  it("detects store as Maxima", () => {
    expect(receipt.store).toBe(Store.Maxima);
  });

  it("parses total: 6.57 EUR", () => {
    expect(receipt.total).toBe(6.57);
  });

  it("parses purchase date (2025-09-17)", () => {
    expect(receipt.date?.getFullYear()).toBe(2025);
    expect(receipt.date?.getMonth()).toBe(8); // September (0-indexed)
    expect(receipt.date?.getDate()).toBe(17);
  });

  it("parses exactly 3 line items", () => {
    expect(receipt.items).toHaveLength(3);
  });

  it("parses Baltmaize – simple item (1 × 1.59 EUR)", () => {
    const item = receipt.items.find((i) => i.name.includes("Baltmaize"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(1.59);
    expect(item!.totalPrice).toBe(1.59);
    expect(item!.discount).toBeUndefined();
  });

  it("parses Čipsi ESTRELLA – simple item (1 × 3.39 EUR)", () => {
    const item = receipt.items.find((i) => i.name.includes("ESTRELLA"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(3.39);
    expect(item!.totalPrice).toBe(3.39);
    expect(item!.discount).toBeUndefined();
  });

  it("parses Skābais krējums EXPORTA – discounted (2.09 → 1.59, −0.50)", () => {
    const item = receipt.items.find((i) => i.name.includes("EXPORTA"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(2.09);
    expect(item!.totalPrice).toBe(1.59); // final price paid
    expect(item!.discount).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// Receipt 3 – six items, two discounted, product name wraps across two lines
// ---------------------------------------------------------------------------
describe("MaximaParser – 2066-0130-0910-0264 (6 items, wrapped name, 2 discounted)", () => {
  let receipt: Receipt;

  beforeAll(async () => {
    const buf = readFileSync(datasetPath("2066-0130-0910-0264.pdf"));
    const result = await parseReceiptPdf(buf);
    if (!result.success) throw new Error(result.error);
    receipt = result.receipt;
  });

  it("detects store as Maxima", () => {
    expect(receipt.store).toBe(Store.Maxima);
  });

  it("parses total: 9.56 EUR", () => {
    expect(receipt.total).toBe(9.56);
  });

  it("parses purchase date (2025-08-04)", () => {
    expect(receipt.date?.getFullYear()).toBe(2025);
    expect(receipt.date?.getMonth()).toBe(7); // August (0-indexed)
    expect(receipt.date?.getDate()).toBe(4);
  });

  it("parses exactly 6 line items", () => {
    expect(receipt.items).toHaveLength(6);
  });

  it("parses PRINGLES – 2-line product name, discounted (3.19 → 1.99, −1.20)", () => {
    const item = receipt.items.find((i) => i.name.includes("PRINGLES"));
    expect(item).toBeDefined();
    expect(item!.quantity).toBe(1);
    expect(item!.unitPrice).toBe(3.19);
    expect(item!.totalPrice).toBe(1.99);
    expect(item!.discount).toBe(1.2);
  });

  it("parses Saldskābmaize KURŠU – simple item between two discounted items", () => {
    const item = receipt.items.find((i) => i.name.includes("KURŠU"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(1.29);
    expect(item!.totalPrice).toBe(1.29);
    expect(item!.discount).toBeUndefined();
  });

  it("parses Skābais krējums VALMIERA – discounted (2.25 → 1.99, −0.26)", () => {
    const item = receipt.items.find((i) => i.name.includes("VALMIERA"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(2.25);
    expect(item!.totalPrice).toBe(1.99);
    expect(item!.discount).toBe(0.26);
  });

  it("parses Kartupeļi TWINBAG – simple item (1 × 2.99 EUR)", () => {
    const item = receipt.items.find((i) => i.name.includes("TWINBAG"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(2.99);
    expect(item!.totalPrice).toBe(2.99);
    expect(item!.discount).toBeUndefined();
  });

  it("parses Tomāti – weight-based item (0.388 kg × 2.49 EUR/kg)", () => {
    const item = receipt.items.find((i) => i.name.includes("Tom"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(2.49);
    expect(item!.quantity).toBe(0.388);
    expect(item!.totalPrice).toBe(0.97);
    expect(item!.discount).toBeUndefined();
  });

  it("parses Gurķi – weight-based item (0.280 kg × 1.19 EUR/kg)", () => {
    const item = receipt.items.find((i) => i.name.includes("Gurķ"));
    expect(item).toBeDefined();
    expect(item!.unitPrice).toBe(1.19);
    expect(item!.quantity).toBe(0.28);
    expect(item!.totalPrice).toBe(0.33);
    expect(item!.discount).toBeUndefined();
  });
});
