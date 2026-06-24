import { describe, expect, it } from "vitest";
import { addMoney, money } from "./money.js";

describe("money value object", () => {
  it("accepts positive minor units", () => {
    expect(money(100_00)).toEqual({ amountMinor: 100_00, currencyCode: "USD" });
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])("rejects invalid amount %s", (amount) => {
    expect(() => money(amount)).toThrow("Money amount must be a positive safe integer");
  });

  it("adds same-currency money", () => {
    expect(addMoney([money(40_00), money(60_00)])).toEqual({
      amountMinor: 100_00,
      currencyCode: "USD",
    });
  });

  it("rejects empty collections", () => {
    expect(() => addMoney([])).toThrow("Money collection cannot be empty");
  });
});
