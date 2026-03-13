import type { MatchResult, Matcher } from "../engine/types";

export function regexMatcher(pattern: RegExp | string, flags?: string): Matcher {
  const expression = pattern instanceof RegExp ? pattern : new RegExp(pattern, flags);

  return {
    kind: "regex",
    match: ({ normalized }): MatchResult => {
      expression.lastIndex = 0;
      const matched = expression.test(normalized.value);

      return matched ? { matched: true, reason: "regex" } : { matched: false };
    },
  };
}
