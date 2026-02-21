#!/usr/bin/env node
/**
 * Manual test helper – parses a receipt PDF and prints the result.
 *
 * Usage:
 *   npm run build
 *   node parse.mjs <path-to-pdf>
 *
 * Examples:
 *   node parse.mjs dataset/2022-0020-5300-6116.pdf
 *   node parse.mjs dataset/31-3150660.pdf
 */
import { parseReceiptPdf } from "./dist/index.js";
import { readFileSync } from "fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node parse.mjs <path-to-pdf>");
  process.exit(1);
}

const buf = readFileSync(file);
const result = await parseReceiptPdf(buf);

if (!result.success) {
  console.error("Parse failed:", result.error);
  process.exit(1);
}

const { receipt } = result;
console.log(`Store : ${receipt.store}`);
console.log(`Date  : ${receipt.date?.toLocaleDateString("lv-LV") ?? "unknown"}`);
console.log(`Total : ${receipt.total} EUR`);
console.log(`\nItems (${receipt.items.length}):`);
for (const item of receipt.items) {
  const disc = item.discount != null ? `  [-${item.discount.toFixed(2)} EUR]` : "";
  console.log(
    `  ${item.name.padEnd(50)} ${String(item.quantity).padStart(6)} × ${String(item.unitPrice).padStart(6)} = ${item.totalPrice.toFixed(2)} EUR${disc}`
  );
}
