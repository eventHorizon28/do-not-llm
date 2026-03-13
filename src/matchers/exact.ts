import type { MatchResult, Matcher } from "../engine/types";

function toArray(values: string | readonly string[]): readonly string[] {
  if (typeof values === "string") {
    return [values];
  }

  return values;
}

export function exactMatcher(values: string | readonly string[]): Matcher {
  const normalizedValues = new Set(
    toArray(values)
      .map((value) => value.trim().replace(/\s+/g, " ").toLowerCase())
      .filter((value) => value.length > 0),
  );

  return {
    kind: "exact",
    match: ({ normalized }): MatchResult => {
      const matched = normalizedValues.has(normalized.value);

      return matched ? { matched: true, reason: "exact" } : { matched: false };
    },
  };
}
