import { describe, it, expect } from "vitest";
import { Store } from "../src/types";

describe("Store enum", () => {
  it("has Maxima and Rimi values", () => {
    expect(Store.Maxima).toBe("MAXIMA");
    expect(Store.Rimi).toBe("RIMI");
  });
});
