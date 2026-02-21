import { describe, it, expect } from "vitest";
import { MaximaParser } from "../src/parsers/maxima";
import { Store } from "../src/types";

describe("MaximaParser", () => {
  const parser = new MaximaParser();

  it("has store set to Maxima", () => {
    expect(parser.store).toBe(Store.Maxima);
  });

  describe("matches", () => {
    it("returns true when text contains MAXIMA", () => {
      expect(parser.matches("SIA MAXIMA Latvija\nBrīvības iela 1")).toBe(true);
    });

    it("returns true for lowercase maxima", () => {
      expect(parser.matches("maxima shop receipt")).toBe(true);
    });

    it("returns false when text does not contain MAXIMA", () => {
      expect(parser.matches("SIA RIMI Latvia\nsome receipt")).toBe(false);
    });
  });

  describe("parse", () => {
    // Mirrors the real multi-line format used by Maxima's text-based PDF receipts.
    // Each item spans 3 lines: name / unitPrice X qty unit / total A
    // A discounted item is followed by two more lines: Atlaide label / -amount A
    const sampleReceipt = [
      'SIA "MAXIMA Latvija"',
      "Veikals \"Maxima\"",
      "Brīvības iela 12, Rīga, t.80002020",
      "Kase Nr.1",
      "",
      "Baltmaize Lielā galda Latvijā cepts 500g",
      "1,59 X 1 gab.",
      "1,59 A",
      "Piena šokolāde Alpine Milk MILKA 90g",
      "2,59 X 2 gab.",
      "5,18 A",
      "Skābais krējums EXPORTA 25% 360g",
      "2,09 X 1 gab.",
      "2,09 A",
      "Atlaide: (Cena ar atlaidi 1,59)",
      "-0,50 A",
      "====",
      "SUMMA bez atlaides kopā 9,27",
      "SUMMA apmaksai 8,77",
      "Kopā apmaksai 8,77",
      "17.09.2025 15:40:50",
    ].join("\n");

    it("returns the correct store", () => {
      expect(parser.parse(sampleReceipt).store).toBe(Store.Maxima);
    });

    it("parses all three items", () => {
      const { items } = parser.parse(sampleReceipt);
      expect(items).toHaveLength(3);
    });

    it("parses a single-unit item", () => {
      const { items } = parser.parse(sampleReceipt);
      const bread = items.find((i) => i.name.includes("Baltmaize"));
      expect(bread).toBeDefined();
      expect(bread!.quantity).toBe(1);
      expect(bread!.unitPrice).toBe(1.59);
      expect(bread!.totalPrice).toBe(1.59);
      expect(bread!.discount).toBeUndefined();
    });

    it("parses an item bought in quantity > 1", () => {
      const { items } = parser.parse(sampleReceipt);
      const choc = items.find((i) => i.name.includes("MILKA"));
      expect(choc).toBeDefined();
      expect(choc!.quantity).toBe(2);
      expect(choc!.unitPrice).toBe(2.59);
      expect(choc!.totalPrice).toBe(5.18);
      expect(choc!.discount).toBeUndefined();
    });

    it("parses a discounted item: totalPrice reflects the final price paid", () => {
      const { items } = parser.parse(sampleReceipt);
      const cream = items.find((i) => i.name.includes("EXPORTA"));
      expect(cream).toBeDefined();
      expect(cream!.unitPrice).toBe(2.09);   // price before discount
      expect(cream!.totalPrice).toBe(1.59);  // final price paid
      expect(cream!.discount).toBe(0.5);
    });

    it("parses the post-discount total", () => {
      expect(parser.parse(sampleReceipt).total).toBe(8.77);
    });

    it("parses the date", () => {
      const { date } = parser.parse(sampleReceipt);
      expect(date).toBeDefined();
      expect(date!.getFullYear()).toBe(2025);
      expect(date!.getMonth()).toBe(8); // September = 8 (0-indexed)
      expect(date!.getDate()).toBe(17);
    });

    it("parses the address", () => {
      expect(parser.parse(sampleReceipt).address).toContain("Brīvības iela");
    });

    it("preserves raw text", () => {
      expect(parser.parse(sampleReceipt).rawText).toBe(sampleReceipt);
    });
  });
});
