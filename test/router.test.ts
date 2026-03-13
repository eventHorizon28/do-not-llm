import { describe, expect, it } from "vitest";
import { createRouter } from "../src/engine/router";
import { exactMatcher } from "../src/matchers/exact";
import { keywordMatcher } from "../src/matchers/keyword";
import { regexMatcher } from "../src/matchers/regex";
import { greetingsPreset } from "../src/presets/greetings";
import { functionResolver } from "../src/resolvers/function";
import { staticResolver } from "../src/resolvers/static";

describe("createRouter", () => {
  it("intercepts exact matches", () => {
    const router = createRouter({
      rules: [
        {
          id: "hello",
          match: [exactMatcher("hello")],
          resolve: staticResolver("world"),
        },
      ],
    });

    const result = router.route("  Hello   ");

    expect(result.intercepted).toBe(true);
    if (result.intercepted) {
      expect(result.response).toBe("world");
      expect(result.reason).toBe("exact_match:hello");
      expect(result.decision.ruleId).toBe("hello");
      expect(result.decision.reason).toBe("exact_match:hello");
    }
  });

  it("returns passthrough by default when nothing matches", () => {
    const router = createRouter({ rules: [] });
    const result = router.route("ask the llm");

    expect(result).toEqual({
      intercepted: false,
      input: "ask the llm",
      normalized: {
        raw: "ask the llm",
        value: "ask the llm",
        tokens: ["ask", "the", "llm"],
      },
    });
  });

  it("keeps deterministic ordering by priority then insertion order", () => {
    const hits: string[] = [];
    const router = createRouter({
      rules: [
        {
          id: "second",
          priority: 20,
          match: [exactMatcher("hello")],
          resolve: functionResolver(() => {
            hits.push("second");
            return "second";
          }),
        },
        {
          id: "first",
          priority: 10,
          match: [exactMatcher("hello")],
          resolve: functionResolver(() => {
            hits.push("first");
            return "first";
          }),
        },
        {
          id: "third",
          priority: 20,
          match: [exactMatcher("hello")],
          resolve: functionResolver(() => {
            hits.push("third");
            return "third";
          }),
        },
      ],
    });

    const result = router.route("hello");

    expect(result.intercepted).toBe(true);
    expect(hits).toEqual(["first"]);
    expect(router.rules.map((rule) => rule.id)).toEqual(["first", "second", "third"]);
  });

  it("supports regex and keyword matchers", () => {
    const router = createRouter({
      rules: [
        {
          id: "regex",
          priority: 5,
          match: [regexMatcher(/^help/)],
          resolve: staticResolver("regex"),
        },
        {
          id: "keyword",
          priority: 10,
          match: [keywordMatcher(["password", "reset"], { matchAll: true })],
          resolve: staticResolver("keyword"),
        },
      ],
    });

    expect(router.route("help me")).toMatchObject({
      intercepted: true,
      response: "regex",
    });

    expect(router.route("password reset now")).toMatchObject({
      intercepted: true,
      response: "keyword",
    });
  });

  it("supports presets", () => {
    const router = createRouter({
      rules: [...greetingsPreset()],
    });

    const result = router.route("hey");

    expect(result.intercepted).toBe(true);
    if (result.intercepted) {
      expect(result.decision.ruleId).toBe("greeting");
      expect(result.reason).toBe("exact_match:greeting");
      expect(result.response).toBe("Hello 👋");
    }
  });

  it("runs semantic matching after exact and regex matchers", () => {
    const router = createRouter({
      rules: [
        {
          id: "hours",
          match: [exactMatcher("support hours"), regexMatcher(/^support availability$/)],
          semanticExamples: ["what time is support open", "when are you available"],
          threshold: 0.5,
          resolve: staticResolver("Hours answer"),
        },
      ],
    });

    const result = router.route("what time is support open today");

    expect(result.intercepted).toBe(true);
    if (result.intercepted) {
      expect(result.response).toBe("Hours answer");
      expect(result.decision.ruleId).toBe("hours");
      expect(result.reason).toBe("semantic_match:hours");
      expect(result.decision.reason).toBe("semantic_match:hours");
      expect(result.decision.score).toBeGreaterThanOrEqual(0.5);
    }
  });

  it("prefers exact matches before semantic matches on the same rule", () => {
    const router = createRouter({
      rules: [
        {
          id: "hello",
          match: [regexMatcher(/^hello$/), exactMatcher("hello")],
          semanticExamples: ["hello there"],
          threshold: 0.1,
          resolve: staticResolver("world"),
        },
      ],
    });

    const result = router.route("hello");

    expect(result.intercepted).toBe(true);
    if (result.intercepted) {
      expect(result.reason).toBe("exact_match:hello");
      expect(result.decision.reason).toBe("exact_match:hello");
      expect(result.decision.score).toBeUndefined();
    }
  });
});
