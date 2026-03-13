import type { NormalizeOptions, NormalizedInput, RouteInput } from "./types";

const DEFAULT_OPTIONS: Required<NormalizeOptions> = {
  lowercase: true,
  collapseWhitespace: true,
  trim: true,
};

export function normalizeInput(
  input: RouteInput,
  options: NormalizeOptions = {},
): NormalizedInput {
  const settings = { ...DEFAULT_OPTIONS, ...options };

  let value = input;

  if (settings.trim) {
    value = value.trim();
  }

  if (settings.collapseWhitespace) {
    value = value.replace(/\s+/g, " ");
  }

  if (settings.lowercase) {
    value = value.toLowerCase();
  }

  return {
    raw: input,
    value,
    tokens: value.length === 0 ? [] : value.split(" "),
  };
}
