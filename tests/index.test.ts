import { describe, it, expect } from "vitest";
import { parseReceiptText, detectStore } from "../src/index";
import { Store } from "../src/types";

describe("detectStore", () => {
  it("detects Maxima", () => {
    expect(detectStore("SIA MAXIMA Latvija receipt")).toBe(Store.Maxima);
  });

  it("detects Rimi", () => {
    expect(detectStore("RIMI Latvia supermarket")).toBe(Store.Rimi);
  });

  it("returns undefined for unknown store", () => {
    expect(detectStore("Some unknown store receipt")).toBeUndefined();
  });
});

describe("parseReceiptText", () => {
  it("parses a Maxima receipt successfully", () => {
    const text = [
      "SIA MAXIMA Latvija",
      "PIENA MAIZE 1 x 0,89 0,89",
      "KOPĀ 0,89",
    ].join("\n");

    const result = parseReceiptText(text);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.receipt.store).toBe(Store.Maxima);
      expect(result.receipt.total).toBe(0.89);
    }
  });

  it("parses a Rimi receipt successfully", () => {
    const text = [
      "SIA RIMI Latvia",
      "PIENA MAIZE 0,89 A",
      "KOPĀ 0,89",
    ].join("\n");

    const result = parseReceiptText(text);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.receipt.store).toBe(Store.Rimi);
      expect(result.receipt.total).toBe(0.89);
    }
  });

  it("returns error for unrecognized store", () => {
    const result = parseReceiptText("Random text with no store markers");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Unable to detect store");
    }
  });

  it("accepts a store hint via options", () => {
    const text = "PIENA MAIZE 1 x 0,89 0,89\nKOPĀ 0,89";
    const result = parseReceiptText(text, { store: Store.Maxima });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.receipt.store).toBe(Store.Maxima);
    }
  });
});
