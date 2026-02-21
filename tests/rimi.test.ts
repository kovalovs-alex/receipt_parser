import { describe, it, expect } from "vitest";
import { RimiParser } from "../src/parsers/rimi";
import { Store } from "../src/types";

describe("RimiParser", () => {
  const parser = new RimiParser();

  it("has store set to Rimi", () => {
    expect(parser.store).toBe(Store.Rimi);
  });

  describe("matches", () => {
    it("returns true when text contains RIMI", () => {
      expect(parser.matches("SIA RIMI Latvia\nĀgenskalna iela 5")).toBe(true);
    });

    it("returns true for lowercase rimi", () => {
      expect(parser.matches("rimi supermarket")).toBe(true);
    });

    it("returns false when text does not contain RIMI", () => {
      expect(parser.matches("SIA MAXIMA Latvija\nsome receipt")).toBe(false);
    });
  });

  describe("parse", () => {
    const sampleReceipt = [
      "SIA RIMI Latvia",
      "Āgenskalna iela 5, Rīga",
      "20/06/2024 10:15",
      "PIENA MAIZE 0,89 A",
      "SVIESTS 3,00 A",
      "2 x 1,50",
      "ĀBOLI 1,20 A",
      "KOPĀ 5,09",
    ].join("\n");

    it("parses simple items", () => {
      const receipt = parser.parse(sampleReceipt);
      expect(receipt.store).toBe(Store.Rimi);
      expect(receipt.items.length).toBeGreaterThanOrEqual(2);

      const bread = receipt.items.find((i) => i.name.includes("PIENA MAIZE"));
      expect(bread).toBeDefined();
      expect(bread!.totalPrice).toBe(0.89);
    });

    it("parses items followed by quantity line", () => {
      const receipt = parser.parse(sampleReceipt);
      const butter = receipt.items.find((i) => i.name.includes("SVIESTS"));
      expect(butter).toBeDefined();
      expect(butter!.quantity).toBe(2);
      expect(butter!.unitPrice).toBe(1.5);
      expect(butter!.totalPrice).toBe(3.0);
    });

    it("parses the total", () => {
      const receipt = parser.parse(sampleReceipt);
      expect(receipt.total).toBe(5.09);
    });

    it("parses the date", () => {
      const receipt = parser.parse(sampleReceipt);
      expect(receipt.date).toBeDefined();
      expect(receipt.date!.getFullYear()).toBe(2024);
      expect(receipt.date!.getMonth()).toBe(5); // June is 0-indexed = 5
      expect(receipt.date!.getDate()).toBe(20);
    });

    it("parses the address", () => {
      const receipt = parser.parse(sampleReceipt);
      expect(receipt.address).toContain("Āgenskalna iela");
    });

    it("preserves raw text", () => {
      const receipt = parser.parse(sampleReceipt);
      expect(receipt.rawText).toBe(sampleReceipt);
    });
  });
});
