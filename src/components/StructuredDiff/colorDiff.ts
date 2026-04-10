import {
  ColorDiff,
  ColorFile,
  getSyntaxTheme as nativeGetSyntaxTheme,
  type SyntaxTheme,
} from 'color-diff-napi'
import { isEnvDefinedFalsy } from '../../utils/envUtils.js'

export type ColorModuleUnavailableReason = 'env'

/**
 * Returns a static reason why the color-diff module is unavailable, or null if available.
 * 'env' = disabled via CLAUDE_CODE_SYNTAX_HIGHLIGHT
 *
 * The TS port of color-diff works in all build modes, so the only way to
 * disable it is via the env var.
 */
export function getColorModuleUnavailableReason(): ColorModuleUnavailableReason | null {
  if (isEnvDefinedFalsy(process.env.CLAUDE_CODE_SYNTAX_HIGHLIGHT)) {
    return 'env'
  }
  return null
}

export function expectColorDiff(): typeof ColorDiff | null {
  if (getColorModuleUnavailableReason() !== null) return null
  if (typeof ColorDiff !== 'function') return null
  return ColorDiff
}

export function expectColorFile(): typeof ColorFile | null {
  if (getColorModuleUnavailableReason() !== null) return null
  // Guard against stub builds where color-diff-napi exports {}
  if (typeof ColorFile !== 'function') return null
  // Guard against partial stubs where the class exists but render() is missing
  // (can happen on Linux if the native .node binary isn't available)
  try {
    if (typeof (ColorFile.prototype as { render?: unknown })?.render !== 'function') return null
  } catch {
    return null
  }
  return ColorFile
}

export function getSyntaxTheme(themeName: string): SyntaxTheme | null {
  return getColorModuleUnavailableReason() === null
    ? nativeGetSyntaxTheme(themeName)
    : null
}
