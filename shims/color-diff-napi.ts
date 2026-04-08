// Shim for color-diff-napi (Anthropic internal native addon — syntax diff coloring)
// Falls back gracefully: the codebase checks getColorModuleUnavailableReason() before using these

export class ColorDiff {
  static diff(_a: unknown, _b: unknown) { return [] }
}

export class ColorFile {
  static colorize(_code: string, _lang: string) { return [] }
}

export function getSyntaxTheme(_name: string) { return null }
export type SyntaxTheme = object
