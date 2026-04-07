function parseInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function parsePagination(
  limitValue: unknown,
  offsetValue: unknown,
  options: { defaultLimit?: number; maxLimit?: number } = {},
): { limit: number; offset: number } {
  const defaultLimit = options.defaultLimit ?? 50;
  const maxLimit = options.maxLimit ?? 100;

  const rawLimit = parseInteger(limitValue);
  const rawOffset = parseInteger(offsetValue);

  const limit = rawLimit === null ? defaultLimit : Math.min(Math.max(rawLimit, 1), maxLimit);
  const offset = rawOffset === null ? 0 : Math.max(rawOffset, 0);

  return { limit, offset };
}
