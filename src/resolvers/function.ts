import type { ResolveContext, Resolver } from "../engine/types";

export function functionResolver(fn: (context: ResolveContext) => string): Resolver {
  return fn;
}
