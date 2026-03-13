export type RouteInput = string;

export interface NormalizeOptions {
  lowercase?: boolean;
  collapseWhitespace?: boolean;
  trim?: boolean;
}

export interface NormalizedInput {
  raw: string;
  value: string;
  tokens: string[];
}

export interface MatchContext {
  input: RouteInput;
  normalized: NormalizedInput;
}

export type MatcherKind = "exact" | "regex" | "keyword" | "custom";

export interface MatchResult {
  matched: boolean;
  reason?: string;
}

export interface Matcher {
  kind: MatcherKind;
  match(context: MatchContext): MatchResult;
}

export interface ResolveContext extends MatchContext {
  rule: Rule;
}

export type ResolveResult = string;

export type Resolver = (context: ResolveContext) => ResolveResult;

export interface Rule {
  id: string;
  priority?: number;
  match: readonly Matcher[];
  resolve: Resolver;
  semanticExamples?: readonly string[];
  threshold?: number;
}

export interface RouteDecision {
  ruleId: string;
  reason?: string;
  score?: number;
}

export interface InterceptDecision {
  intercepted: true;
  reason: string;
  response: ResolveResult;
  decision: RouteDecision;
  normalized: NormalizedInput;
}

export interface PassthroughResult {
  intercepted: false;
  input: RouteInput;
  normalized: NormalizedInput;
  reason?: string;
}

export type RouteResult = InterceptDecision | PassthroughResult;

export type FallbackHandler = (context: MatchContext) => PassthroughResult;

export interface RouterOptions {
  rules: readonly Rule[];
  normalize?: NormalizeOptions;
  fallback?: FallbackHandler;
}

export interface Router {
  route(input: RouteInput): RouteResult;
  readonly rules: readonly Rule[];
}
