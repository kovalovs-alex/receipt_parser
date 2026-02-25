import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseReceiptPdf } from "../../src/index";
import { Store, type Receipt } from "../../src/types";

const OCR_TIMEOUT = 120_000;
const strictIt = process.env.STRICT_OCR_PRECISION === "1" ? it : it.skip;

function fixturePath(filename: string): string {
  return join(__dirname, "fixtures", filename);
}

function approxEqual(actual: number, expected: number, epsilon = 0.01): boolean {
  return Math.abs(actual - expected) <= epsilon;
}

function findItem(receipt: Receipt, nameIncludes: string) {
  return receipt.items.find((item) => item.name.includes(nameIncludes));
}

function score(receipt: Receipt, checks: Array<() => boolean>) {
  const passed = checks.reduce((count, check) => count + (check() ? 1 : 0), 0);
  const total = checks.length;
  return {
    passed,
    total,
    precision: passed / total,
  };
}

const trickyReceipts = [
  {
    file: "31-3150660.pdf",
    checks: (receipt: Receipt) => [
      () => receipt.store === Store.Rimi,
      () => approxEqual(receipt.total, 48.75),
      () => receipt.date?.getFullYear() === 2025,
      () => receipt.date?.getMonth() === 6,
      () => receipt.date?.getDate() === 17,
      () => receipt.items.length === 17,
      () => {
        const item = findItem(receipt, "B&J");
        return !!item && item.name.includes("465ml/406g") && approxEqual(item.totalPrice, 4.99) && approxEqual(item.discount ?? 0, 5);
      },
      () => {
        const item = findItem(receipt, "Dracula Cola");
        return !!item && item.name.includes("54ml/40g") && approxEqual(item.unitPrice, 0.85);
      },
      () => {
        const item = findItem(receipt, "WHITE RABBIT");
        return !!item && approxEqual(item.totalPrice, 4.99);
      },
      () => {
        const chars = ["0", "b", "1", "l", "8"];
        const source = receipt.items
          .map((item) => `${item.name} ${item.unitPrice} ${item.totalPrice}`)
          .join(" ")
          .toLowerCase();
        return chars.every((char) => source.includes(char));
      },
    ],
  },
  {
    file: "31-3167867.pdf",
    checks: (receipt: Receipt) => [
      () => receipt.store === Store.Rimi,
      () => approxEqual(receipt.total, 38.45),
      () => receipt.date?.getFullYear() === 2025,
      () => receipt.date?.getMonth() === 9,
      () => receipt.date?.getDate() === 12,
      () => receipt.items.length === 14,
      () => {
        const item = findItem(receipt, "Rožu pušķis");
        return !!item && approxEqual(item.totalPrice, 6.99);
      },
      () => {
        const item = findItem(receipt, "Cīsiņi Vīnes");
        return !!item && approxEqual(item.totalPrice, 3.99) && approxEqual(item.discount ?? 0, 0.9);
      },
      () => {
        const item = findItem(receipt, "Gurķi īsie");
        return !!item && approxEqual(item.quantity, 0.352, 0.001) && approxEqual(item.totalPrice, 1.05);
      },
      () => {
        const item = findItem(receipt, "Ledenes Halls");
        return !!item && approxEqual(item.quantity, 2, 0.001);
      },
    ],
  },
  {
    file: "34-3434800.pdf",
    checks: (receipt: Receipt) => [
      () => receipt.store === Store.Rimi,
      () => approxEqual(receipt.total, 41.37),
      () => receipt.date?.getFullYear() === 2025,
      () => receipt.date?.getMonth() === 9,
      () => receipt.date?.getDate() === 29,
      () => receipt.items.length === 15,
      () => {
        const item = findItem(receipt, "Suši ar tvaicētu lasi");
        return !!item && approxEqual(item.quantity, 0.208, 0.001) && approxEqual(item.totalPrice, 5.41);
      },
      () => {
        const item = findItem(receipt, "Fanta");
        return !!item && approxEqual(item.totalPrice, 1.49) && approxEqual(item.discount ?? 0, 1.7);
      },
      () => {
        const item = findItem(receipt, "Surimi nūjiņas");
        return !!item && approxEqual(item.totalPrice, 3.99) && approxEqual(item.discount ?? 0, 1.6);
      },
      () => receipt.items.filter((item) => item.name.includes("Depozīta maksa")).length === 2,
    ],
  },
  {
    file: "35-3566116.pdf",
    checks: (receipt: Receipt) => [
      () => receipt.store === Store.Rimi,
      () => approxEqual(receipt.total, 14.08),
      () => receipt.date?.getFullYear() === 2025,
      () => receipt.date?.getMonth() === 9,
      () => receipt.date?.getDate() === 28,
      () => receipt.items.length === 7,
      () => {
        const item = findItem(receipt, "Sviestmaize Rimi polārā ar vistu");
        return !!item && approxEqual(item.totalPrice, 2.59) && approxEqual(item.discount ?? 0, 0.7);
      },
      () => {
        const item = findItem(receipt, "Vājpiena biezpiens");
        return !!item && approxEqual(item.totalPrice, 0.79) && approxEqual(item.discount ?? 0, 0.7);
      },
      () => {
        const item = findItem(receipt, "Banāni Cavendish");
        return (
          !!item &&
          approxEqual(item.quantity, 1.01, 0.001) &&
          approxEqual(item.totalPrice, 1.0) &&
          approxEqual(item.discount ?? 0, 0.4)
        );
      },
      () => {
        const item = findItem(receipt, "Mandarīni Clementines");
        return !!item && approxEqual(item.quantity, 0.466, 0.001) && approxEqual(item.totalPrice, 1.39);
      },
    ],
  },
] as const;

async function evaluatePrecision(threshold: number) {
  const precisionResults: number[] = [];

  for (const candidate of trickyReceipts) {
    const buffer = readFileSync(fixturePath(candidate.file));
    const result = await parseReceiptPdf(buffer);

    expect(result.success).toBe(true);
    if (!result.success) continue;

    const receipt = result.receipt;
    const scored = score(receipt, candidate.checks(receipt));

    precisionResults.push(scored.precision);
    expect(scored.precision).toBeGreaterThanOrEqual(threshold);
  }

  const averagePrecision =
    precisionResults.reduce((sum, value) => sum + value, 0) / precisionResults.length;

  expect(averagePrecision).toBeGreaterThanOrEqual(threshold);
}

describe("Rimi OCR precision – tricky receipts", () => {
  it(
    "keeps >= 90% precision on difficult OCR files",
    async () => evaluatePrecision(0.9),
    OCR_TIMEOUT
  );

  strictIt(
    "optional strict target >= 93% precision",
    async () => evaluatePrecision(0.93),
    OCR_TIMEOUT
  );

  strictIt(
    "optional strict target >= 95% precision",
    async () => evaluatePrecision(0.95),
    OCR_TIMEOUT
  );

  strictIt(
    "optional strict target >= 97% precision",
    async () => evaluatePrecision(0.97),
    OCR_TIMEOUT
  );

  strictIt(
    "optional strict target >= 99% precision",
    async () => evaluatePrecision(0.99),
    OCR_TIMEOUT
  );
});
