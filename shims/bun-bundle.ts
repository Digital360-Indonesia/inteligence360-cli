// Shim for bun:bundle compile-time feature flags.
// All internal Anthropic features are disabled for personal use.
export function feature(_name: string): boolean {
  return false;
}
