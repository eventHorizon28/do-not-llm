import type { Resolver } from "../engine/types";

export function staticResolver(output: string): Resolver {
  return () => output;
}
