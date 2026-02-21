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
    const sampleReceipt = [
      "SIA MAXIMA Latvija",
      "Brīvības iela 12, Rīga",
      "15/03/2024 14:30",
      "PIENA MAIZE 1 x 0,89 0,89",
      "SVIESTS 2 x 1,50 3,00",
      "ĀBOLI 0,65",
      "KOPĀ 4,54",
    ].join("\n");

    it("parses items with quantity notation", () => {
      const receipt = parser.parse(sampleReceipt);
      expect(receipt.store).toBe(Store.Maxima);
      expect(receipt.items.length).toBeGreaterThanOrEqual(2);

      const bread = receipt.items.find((i) => i.name.includes("PIENA MAIZE"));
      expect(bread).toBeDefined();
      expect(bread!.quantity).toBe(1);
      expect(bread!.unitPrice).toBe(0.89);
      expect(bread!.totalPrice).toBe(0.89);
    });

    it("parses items with quantity > 1", () => {
      const receipt = parser.parse(sampleReceipt);
      const butter = receipt.items.find((i) => i.name.includes("SVIESTS"));
      expect(butter).toBeDefined();
      expect(butter!.quantity).toBe(2);
      expect(butter!.unitPrice).toBe(1.5);
      expect(butter!.totalPrice).toBe(3.0);
    });

    it("parses simple items without quantity", () => {
      const receipt = parser.parse(sampleReceipt);
      const apples = receipt.items.find((i) => i.name.includes("ĀBOLI"));
      expect(apples).toBeDefined();
      expect(apples!.totalPrice).toBe(0.65);
    });

    it("parses the total", () => {
      const receipt = parser.parse(sampleReceipt);
      expect(receipt.total).toBe(4.54);
    });

    it("parses the date", () => {
      const receipt = parser.parse(sampleReceipt);
      expect(receipt.date).toBeDefined();
      expect(receipt.date!.getFullYear()).toBe(2024);
      expect(receipt.date!.getMonth()).toBe(2); // March is 0-indexed = 2
      expect(receipt.date!.getDate()).toBe(15);
    });

    it("parses the address", () => {
      const receipt = parser.parse(sampleReceipt);
      expect(receipt.address).toContain("Brīvības iela");
    });

    it("preserves raw text", () => {
      const receipt = parser.parse(sampleReceipt);
      expect(receipt.rawText).toBe(sampleReceipt);
    });
  });
});
