# do-not-llm

`do-not-llm` is a small TypeScript router that intercepts trivial requests before they reach an LLM. It is built for deterministic rule ordering, fast synchronous matching, and a narrow public API.

## Features

- Fast synchronous matchers: exact, regex, and keyword.
- Optional semantic interception using token-vector cosine similarity over `semanticExamples`.
- Deterministic rule ordering using `priority` and insertion order.
- Strong TypeScript types for rules, resolvers, decisions, and context.
- Minimal dependencies: only `tsup`, `typescript`, and `vitest` for development.
- Node 18+ compatible.

## Install

```bash
npm install do-not-llm
```

## Quick Start

```ts
import {
  createRouter,
  exactMatcher,
  keywordMatcher,
  greetingsPreset,
  staticResolver,
} from "do-not-llm";

const router = createRouter({
  rules: [
    ...greetingsPreset(),
    {
      id: "pricing-faq",
      priority: 50,
      match: [keywordMatcher(["price", "pricing", "cost"])],
      resolve: staticResolver("Pricing questions should be answered from the billing FAQ."),
      semanticExamples: ["how much does it cost", "what is the price"],
      threshold: 0.55,
    },
  ],
  fallback: ({ input, normalized }) => ({
    intercepted: false,
    input,
    normalized,
  }),
});

const result = router.route("hello there");

if (result.intercepted) {
  console.log(result.reason);
  console.log(result.response);
}
```

## Public API

```ts
createRouter(options)
normalizeInput(input, options?)
exactMatcher(values)
regexMatcher(pattern, flags?)
keywordMatcher(keywords, options?)
staticResolver(output)
functionResolver(fn)
greetingsPreset()
```

## API Examples

### `createRouter(options)`

Create a router with ordered rules and an optional fallback.

```ts
import { createRouter, exactMatcher, staticResolver } from "do-not-llm";

const router = createRouter({
  rules: [
    {
      id: "healthcheck",
      priority: 1,
      match: [exactMatcher("ping")],
      resolve: staticResolver("pong"),
    },
  ],
});

const result = router.route("ping");
```

### `normalizeInput(input, options?)`

Normalize user input the same way the router does internally.

```ts
import { normalizeInput } from "do-not-llm";

const normalized = normalizeInput("  Hello   There  ");

console.log(normalized.value);
// "hello there"
```

Custom normalization options:

```ts
import { normalizeInput } from "do-not-llm";

const normalized = normalizeInput("  Hello   There  ", {
  lowercase: false,
  collapseWhitespace: true,
  trim: true,
});

console.log(normalized.value);
// "Hello There"
```

### `exactMatcher(values)`

Match exact normalized strings with O(1) set lookup.

```ts
import { createRouter, exactMatcher, staticResolver } from "do-not-llm";

const router = createRouter({
  rules: [
    {
      id: "greeting",
      match: [exactMatcher(["hello", "hi", "hey"])],
      resolve: staticResolver("Hello 👋"),
    },
  ],
});
```

### `regexMatcher(pattern, flags?)`

Match inputs with precompiled regular expressions.

```ts
import { createRouter, regexMatcher, staticResolver } from "do-not-llm";

const router = createRouter({
  rules: [
    {
      id: "email-help",
      match: [regexMatcher(/^help with email/)],
      resolve: staticResolver("Email support is available in the help center."),
    },
  ],
});
```

### `keywordMatcher(keywords, options?)`

Match by token overlap for lightweight intent detection.

```ts
import { createRouter, keywordMatcher, staticResolver } from "do-not-llm";

const router = createRouter({
  rules: [
    {
      id: "password-reset",
      match: [keywordMatcher(["password", "reset"], { matchAll: true })],
      resolve: staticResolver("Reset your password from the account settings page."),
    },
  ],
});
```

At least `minMatches` keywords:

```ts
import { keywordMatcher } from "do-not-llm";

const matcher = keywordMatcher(["invoice", "billing", "payment"], {
  minMatches: 2,
});
```

### `staticResolver(output)`

Return a fixed response for intercepted inputs.

```ts
import { createRouter, exactMatcher, staticResolver } from "do-not-llm";

const router = createRouter({
  rules: [
    {
      id: "hours",
      match: [exactMatcher("store hours")],
      resolve: staticResolver("Store hours are 9am to 5pm."),
    },
  ],
});
```

### `functionResolver(fn)`

Build a dynamic response using the normalized input and matched rule.

```ts
import { createRouter, exactMatcher, functionResolver } from "do-not-llm";

const router = createRouter({
  rules: [
    {
      id: "ping",
      match: [exactMatcher("ping")],
      resolve: functionResolver(({ normalized, rule }) => {
        return `${rule.id}:${normalized.tokens.length}`;
      }),
    },
  ],
});
```

### `greetingsPreset()`

Use the built-in greeting rule out of the box.

```ts
import { createRouter, greetingsPreset } from "do-not-llm";

const router = createRouter({
  rules: [...greetingsPreset()],
});

const result = router.route("hello");

if (result.intercepted) {
  console.log(result.reason);
  // "exact_match:greeting"
}
```

## Rule Model

```ts
import type { Rule } from "do-not-llm";
import { exactMatcher, regexMatcher, staticResolver } from "do-not-llm";

const rule: Rule = {
  id: "hours",
  priority: 10,
  match: [
    exactMatcher(["what are your hours", "store hours"]),
    regexMatcher(/^support hours$/),
  ],
  resolve: staticResolver("Store hours are 9am to 5pm, Monday through Friday."),
  semanticExamples: ["when are you open", "what time do you close"],
  threshold: 0.6,
};
```

Routing order inside a rule:

1. Exact matchers
2. Regex matchers
3. Keyword/custom matchers
4. Semantic similarity against `semanticExamples`
5. Fallback

Rules are sorted once at router construction time:

1. Lower `priority` runs first.
2. For equal priority, earlier rules keep their original order.

That makes routing deterministic across runs.

## Feature Examples

### Intercept Decision Shape

When a rule matches, the router returns a structured decision object.

```ts
const result = router.route("hello");

if (result.intercepted) {
  console.log(result);
  // {
  //   intercepted: true,
  //   reason: "exact_match:greeting",
  //   response: "Hello 👋",
  //   decision: {
  //     ruleId: "greeting",
  //     reason: "exact_match:greeting"
  //   },
  //   normalized: { ... }
  // }
}
```

### Semantic Matching

Use `semanticExamples` and `threshold` when exact or regex matching is too narrow.

```ts
import { createRouter, exactMatcher, staticResolver } from "do-not-llm";

const router = createRouter({
  rules: [
    {
      id: "support-hours",
      match: [exactMatcher("support hours")],
      semanticExamples: [
        "what time is support open",
        "when is customer support available",
      ],
      threshold: 0.5,
      resolve: staticResolver("Support is available from 9am to 5pm."),
    },
  ],
});

const result = router.route("what time is support open today");
```

### Multiple Matcher Types In One Rule

You can combine exact, regex, and keyword matchers on the same rule. The router still evaluates them in fixed stage order.

```ts
import {
  createRouter,
  exactMatcher,
  regexMatcher,
  keywordMatcher,
  staticResolver,
} from "do-not-llm";

const router = createRouter({
  rules: [
    {
      id: "refund",
      match: [
        keywordMatcher(["refund", "return"], { minMatches: 1 }),
        regexMatcher(/^refund status$/),
        exactMatcher("refund"),
      ],
      resolve: staticResolver("Refund requests are handled by the billing workflow."),
    },
  ],
});
```

Even though the matcher array is mixed, the router runs exact first, then regex, then keyword/custom, then semantic.

### Deterministic Rule Ordering

Lower `priority` wins. If priorities are equal, declaration order wins.

```ts
import { createRouter, exactMatcher, staticResolver } from "do-not-llm";

const router = createRouter({
  rules: [
    {
      id: "general",
      priority: 20,
      match: [exactMatcher("hello")],
      resolve: staticResolver("general"),
    },
    {
      id: "preferred",
      priority: 10,
      match: [exactMatcher("hello")],
      resolve: staticResolver("preferred"),
    },
  ],
});

const result = router.route("hello");
```

### Passthrough / Fallback LLM

Use `fallback` to hand unmatched inputs off to another layer, such as an LLM client.

```ts
import { createRouter } from "do-not-llm";

const router = createRouter({
  rules: [],
  fallback: ({ input, normalized }) => ({
    intercepted: false,
    input,
    normalized,
    reason: "delegate-to-llm",
  }),
});
```

## Custom Resolver

```ts
import { createRouter, functionResolver, exactMatcher } from "do-not-llm";

const router = createRouter({
  rules: [
    {
      id: "ping",
      match: [exactMatcher("ping")],
      resolve: functionResolver(({ normalized }) => `pong:${normalized.tokens.length}`),
    },
  ],
});
```

## Fallback

If no rule matches, the router returns a passthrough result unless you provide a custom `fallback`.

```ts
const router = createRouter({
  rules: [],
  fallback: ({ input, normalized }) => ({
    intercepted: false,
    input,
    normalized,
    reason: "delegate-to-llm",
  }),
});
```

## End-to-End Example

```ts
import {
  createRouter,
  exactMatcher,
  regexMatcher,
  keywordMatcher,
  staticResolver,
  functionResolver,
  greetingsPreset,
} from "do-not-llm";

const router = createRouter({
  rules: [
    ...greetingsPreset(),
    {
      id: "support-hours",
      priority: 20,
      match: [
        exactMatcher("support hours"),
        regexMatcher(/^hours for support$/),
        keywordMatcher(["support", "hours"], { matchAll: true }),
      ],
      semanticExamples: [
        "when is support available",
        "what time does support open",
      ],
      threshold: 0.5,
      resolve: staticResolver("Support hours are 9am to 5pm."),
    },
    {
      id: "echo-token-count",
      priority: 30,
      match: [exactMatcher("ping")],
      resolve: functionResolver(({ normalized }) => `tokens:${normalized.tokens.length}`),
    },
  ],
  fallback: ({ input, normalized }) => ({
    intercepted: false,
    input,
    normalized,
    reason: "delegate-to-llm",
  }),
});

console.log(router.route("hello"));
console.log(router.route("what time does support open today"));
console.log(router.route("ping"));
console.log(router.route("write a long product description"));
```

## Testing

```bash
npm test
npm run typecheck
npm run build
```
