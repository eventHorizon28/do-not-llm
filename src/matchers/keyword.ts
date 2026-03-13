import type { MatchResult, Matcher } from "../engine/types";

export interface KeywordMatcherOptions {
  matchAll?: boolean;
  minMatches?: number;
}

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase();
}

export function keywordMatcher(
  keywords: readonly string[],
  options: KeywordMatcherOptions = {},
): Matcher {
  const normalizedKeywords = keywords.map(normalizeKeyword).filter((value) => value.length > 0);
  const keywordSet = new Set(normalizedKeywords);
  const minMatches = options.matchAll ? keywordSet.size : Math.max(1, options.minMatches ?? 1);

  return {
    kind: "keyword",
    match: ({ normalized }): MatchResult => {
      if (keywordSet.size === 0 || normalized.tokens.length === 0) {
        return { matched: false };
      }

      let matches = 0;

      for (const token of normalized.tokens) {
        if (!keywordSet.has(token)) {
          continue;
        }

        matches += 1;
        if (matches >= minMatches) {
          return { matched: true, reason: "keyword" };
        }
      }

      return { matched: false };
    },
  };
}
