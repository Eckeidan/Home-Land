export interface LeaseTerm {
  startDate: Date;
  endDate: Date;
}

export function leaseTerm(startDateText: string, endDateText: string): LeaseTerm {
  const startDate = parseIsoDateOnly(startDateText);
  const endDate = parseIsoDateOnly(endDateText);

  if (startDate >= endDate) {
    throw new Error("Lease start date must precede end date");
  }

  return { startDate, endDate };
}

function parseIsoDateOnly(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("Lease date must be a valid ISO date");
  }

  return parsed;
}
