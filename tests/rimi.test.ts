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
    /**
     * Sample receipt in realistic OCR format.
     *
     * Each item occupies two lines:
     *   <product name>
     *   <qty> gab X <unitPrice> EUR <total> A
     * with an optional third line for discounts:
     *   Atl. -<discount> Gala cena <finalPrice>
     */
    const sampleReceipt = [
      "SIA RIMI Latvia",
      "Jur. adrese: Āgenskalna iela 5, Rīga",
      "--------- Elektroniska izdruka ---------",
      "KLIENTS: 1234567890",
      "PIENA MAIZE",
      "1 gab X 0,89 EUR 0,89 A",
      "SVIESTS",
      "2 gab X 1,50 EUR 3,00 A",
      "ĀBOLI",
      "1 gab X 1,20 EUR 1,20 A",
      "ATLAIDES:",
      "KOPĀ: 5,09 EUR",
      "2024-06-20 10:15:00",
    ].join("\n");

    it("parses simple items", () => {
      const receipt = parser.parse(sampleReceipt);
      expect(receipt.store).toBe(Store.Rimi);
      expect(receipt.items.length).toBeGreaterThanOrEqual(2);

      const bread = receipt.items.find((i) => i.name.includes("PIENA MAIZE"));
      expect(bread).toBeDefined();
      expect(bread!.totalPrice).toBe(0.89);
    });

    it("parses items with qty > 1", () => {
      const receipt = parser.parse(sampleReceipt);
      const butter = receipt.items.find((i) => i.name.includes("SVIESTS"));
      expect(butter).toBeDefined();
      expect(butter!.quantity).toBe(2);
      expect(butter!.unitPrice).toBe(1.5);
      expect(butter!.totalPrice).toBe(3.0);
    });

    it("parses a discounted item", () => {
      const discountReceipt = [
        "SIA RIMI Latvia",
        "--------- Elektroniska izdruka ---------",
        "KLIENTS: 1234567890",
        "Saldējums Milka Karameles",
        "1 gab X 2,75 EUR 2,75 A",
        "Atl. -1,10 Gala cena 1,65",
        "ATLAIDES:",
        "KOPĀ: 1,65 EUR",
        "2024-06-20 10:15:00",
      ].join("\n");

      const receipt = parser.parse(discountReceipt);
      const milka = receipt.items.find((i) => i.name.includes("Milka"));
      expect(milka).toBeDefined();
      expect(milka!.unitPrice).toBe(2.75);
      expect(milka!.totalPrice).toBe(1.65);
      expect(milka!.discount).toBe(1.1);
    });

    it("parses a weight-based item", () => {
      const weightReceipt = [
        "SIA RIMI Latvia",
        "--------- Elektroniska izdruka ---------",
        "KLIENTS: 1234567890",
        "Banāni Cavendish 1kg",
        "0,532 kg X 1,39 EUR/kg 0,74 A",
        "ATLAIDES:",
        "KOPĀ: 0,74 EUR",
        "2024-06-20 10:15:00",
      ].join("\n");

      const receipt = parser.parse(weightReceipt);
      const banani = receipt.items.find((i) => i.name.includes("Ban"));
      expect(banani).toBeDefined();
      expect(banani!.unitPrice).toBe(1.39);
      expect(banani!.quantity).toBe(0.532);
      expect(banani!.totalPrice).toBe(0.74);
    });

    it("parses the total", () => {
      const receipt = parser.parse(sampleReceipt);
      expect(receipt.total).toBe(5.09);
    });

    it("parses the date (YYYY-MM-DD format)", () => {
      const receipt = parser.parse(sampleReceipt);
      expect(receipt.date).toBeDefined();
      expect(receipt.date!.getFullYear()).toBe(2024);
      expect(receipt.date!.getMonth()).toBe(5); // June is 0-indexed = 5
      expect(receipt.date!.getDate()).toBe(20);
    });

    it("parses the address from Jur. adrese line", () => {
      const receipt = parser.parse(sampleReceipt);
      expect(receipt.address).toContain("Āgenskalna iela");
    });

    it("preserves raw text", () => {
      const receipt = parser.parse(sampleReceipt);
      expect(receipt.rawText).toBe(sampleReceipt);
    });
  });
});
