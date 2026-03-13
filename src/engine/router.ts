import { normalizeInput } from "./normalize";
import type {
  FallbackHandler,
  MatchContext,
  Matcher,
  MatchResult,
  PassthroughResult,
  RouteInput,
  RouteResult,
  Router,
  RouterOptions,
  Rule,
} from "./types";

const defaultFallback: FallbackHandler = ({ input, normalized }): PassthroughResult => ({
  intercepted: false,
  input,
  normalized,
});

const DEFAULT_PRIORITY = 100;
const DEFAULT_SEMANTIC_THRESHOLD = 0.82;
const MATCHER_ORDER: readonly Matcher["kind"][] = ["exact", "regex", "keyword", "custom"];

interface CompiledRule {
  rule: Rule;
  semanticExamples: readonly string[][];
}

function sortRules(rules: readonly Rule[]): Rule[] {
  return rules
    .map((rule, index) => ({ rule, index }))
    .sort((left, right) => {
      const leftPriority = left.rule.priority ?? DEFAULT_PRIORITY;
      const rightPriority = right.rule.priority ?? DEFAULT_PRIORITY;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return left.index - right.index;
    })
    .map(({ rule }) => rule);
}

function compileRule(rule: Rule): CompiledRule {
  return {
    rule,
    semanticExamples:
      rule.semanticExamples?.map((example) => normalizeInput(example).tokens).filter((tokens) => tokens.length > 0) ??
      [],
  };
}

function evaluateMatchers(matchers: readonly Matcher[], context: MatchContext): MatchResult | null {
  for (const kind of MATCHER_ORDER) {
    for (const matcher of matchers) {
      if (matcher.kind !== kind) {
        continue;
      }

      const result = matcher.match(context);
      if (result.matched) {
        return result;
      }
    }
  }

  return null;
}

function buildTokenVector(tokens: readonly string[]): Map<string, number> {
  const vector = new Map<string, number>();

  for (const token of tokens) {
    vector.set(token, (vector.get(token) ?? 0) + 1);
  }

  return vector;
}

function cosineSimilarity(leftTokens: readonly string[], rightTokens: readonly string[]): number {
  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0;
  }

  const leftVector = buildTokenVector(leftTokens);
  const rightVector = buildTokenVector(rightTokens);

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (const value of leftVector.values()) {
    leftMagnitude += value * value;
  }

  for (const [token, value] of rightVector.entries()) {
    rightMagnitude += value * value;
    dot += (leftVector.get(token) ?? 0) * value;
  }

  if (dot === 0 || leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function evaluateSemanticMatch(compiledRule: CompiledRule, context: MatchContext): { score: number } | null {
  if (compiledRule.semanticExamples.length === 0) {
    return null;
  }

  const { rule } = compiledRule;
  const threshold = rule.threshold ?? DEFAULT_SEMANTIC_THRESHOLD;
  let bestScore = 0;

  for (const exampleTokens of compiledRule.semanticExamples) {
    const score = cosineSimilarity(context.normalized.tokens, exampleTokens);

    if (score > bestScore) {
      bestScore = score;
    }
  }

  return bestScore >= threshold ? { score: bestScore } : null;
}

function toReasonPrefix(reason: string): string {
  switch (reason) {
    case "exact":
      return "exact_match";
    case "regex":
      return "regex_match";
    case "keyword":
      return "keyword_match";
    case "semantic":
      return "semantic_match";
    default:
      return reason;
  }
}

function buildReason(rule: Rule, reason: string): string {
  return `${toReasonPrefix(reason)}:${rule.id}`;
}

export function createRouter(options: RouterOptions): Router {
  const rules = Object.freeze(sortRules(options.rules));
  const compiledRules = rules.map(compileRule);
  const fallback = options.fallback ?? defaultFallback;

  return {
    rules,
    route(input: RouteInput): RouteResult {
      const normalized = normalizeInput(input, options.normalize);
      const context: MatchContext = { input, normalized };

      for (const compiledRule of compiledRules) {
        const { rule } = compiledRule;
        const matchResult = evaluateMatchers(rule.match, context);

        if (matchResult !== null) {
          const reason = buildReason(rule, matchResult.reason ?? "match");

          return {
            intercepted: true,
            reason,
            response: rule.resolve({ ...context, rule }),
            normalized,
            decision: { ruleId: rule.id, reason },
          };
        }

        const semanticResult = evaluateSemanticMatch(compiledRule, context);
        if (semanticResult !== null) {
          const reason = buildReason(rule, "semantic");

          return {
            intercepted: true,
            reason,
            response: rule.resolve({ ...context, rule }),
            normalized,
            decision: {
              ruleId: rule.id,
              reason,
              score: semanticResult.score,
            },
          };
        }
      }

      return fallback(context);
    },
  };
}
