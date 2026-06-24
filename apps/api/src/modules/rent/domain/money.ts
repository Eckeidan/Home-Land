export type CurrencyCode = "USD";

export interface Money {
  amountMinor: number;
  currencyCode: CurrencyCode;
}

export function money(amountMinor: number, currencyCode: CurrencyCode = "USD"): Money {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("Money amount must be a positive safe integer");
  }

  return { amountMinor, currencyCode };
}

export function addMoney(items: Money[]): Money {
  const [first, ...rest] = items;
  if (!first) throw new Error("Money collection cannot be empty");

  const currencyCode = first.currencyCode;
  if (!rest.every((item) => item.currencyCode === currencyCode)) {
    throw new Error("Money currencies must match");
  }

  return money(
    items.reduce((sum, item) => sum + item.amountMinor, 0),
    currencyCode,
  );
}
