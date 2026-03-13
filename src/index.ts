export { createRouter } from "./engine/router";
export { normalizeInput } from "./engine/normalize";
export { exactMatcher } from "./matchers/exact";
export { regexMatcher } from "./matchers/regex";
export { keywordMatcher } from "./matchers/keyword";
export { staticResolver } from "./resolvers/static";
export { functionResolver } from "./resolvers/function";
export { greetingsPreset } from "./presets/greetings";
export type {
  FallbackHandler,
  MatchContext,
  MatcherKind,
  MatchResult,
  Matcher,
  NormalizeOptions,
  NormalizedInput,
  ResolveContext,
  ResolveResult,
  Resolver,
  RouteDecision,
  RouteInput,
  RouteResult,
  Router,
  RouterOptions,
  Rule,
} from "./engine/types";
