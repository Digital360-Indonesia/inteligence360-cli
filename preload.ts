/**
 * Bun preload script — registered via bunfig.toml [run].preload
 * - Injects build-time globals (MACRO.VERSION etc.)
 * - Handles .md file imports as text strings (replaces Bun bundler's text loader)
 */

// Inject MACRO — a build-time constant normally inlined by the bundler
// @ts-ignore
globalThis.MACRO = {
  VERSION: '1.0.24',
}

// Surface unhandled rejections so missing stub exports don't cause silent exits
process.on('unhandledRejection', (reason: unknown) => {
  const msg = reason instanceof Error
    ? reason.message + '\n' + (reason.stack ?? '')
    : String(reason)
  process.stderr.write('[ERROR] Unhandled rejection: ' + msg + '\n')
})


