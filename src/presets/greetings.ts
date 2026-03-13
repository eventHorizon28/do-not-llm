import type { Rule } from "../engine/types";
import { exactMatcher } from "../matchers/exact";
import { staticResolver } from "../resolvers/static";

export function greetingsPreset(): Rule[] {
  return [
    {
      id: "greeting",
      priority: 10,
      match: [exactMatcher(["hello", "hi", "hey", "good morning", "good afternoon"])],
      resolve: staticResolver("Hello 👋"),
      semanticExamples: ["hello there", "hi team", "good morning", "hey assistant"],
      threshold: 0.5,
    },
  ];
}
