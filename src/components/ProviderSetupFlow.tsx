import chalk from 'chalk'
import React, { useState } from 'react'
import { Box, Text, useInput } from '../ink.js'
import { PROVIDER_KEY_URLS, PROVIDER_NAMES, saveApiKey, testApiKey } from '../utils/providerSetup.js'

type Phase = 'choose' | 'enter-key' | 'testing' | 'error'

type Props = {
  apiKeyEnv: string
  modelLabel: string
  onConfigured: () => void
  onCancel: () => void
}

const NAVY  = '#1e3a8a'
const GOLD  = '#f5c842'
const RED   = '#f87171'
const DIM   = '#6b7280'

// ── Keyboard handler ─────────────────────────────────────────────────────────
function KeyHandler({ onUp, onDown, onEnter, onEsc, onChar }: {
  onUp?: () => void
  onDown?: () => void
  onEnter?: () => void
  onEsc?: () => void
  onChar?: (ch: string) => void
}): React.ReactNode {
  useInput((input, key) => {
    if (key.upArrow && onUp) onUp()
    if (key.downArrow && onDown) onDown()
    if (key.return && onEnter) onEnter()
    if (key.escape && onEsc) onEsc()
    if (!key.return && !key.escape && !key.upArrow && !key.downArrow && onChar) {
      if (key.backspace || key.delete) {
        onChar('\b')
      } else if (input) {
        onChar(input)
      }
    }
  })
  return null
}

// ── Main component ───────────────────────────────────────────────────────────
export function ProviderSetupFlow({ apiKeyEnv, modelLabel, onConfigured, onCancel }: Props): React.ReactNode {
  const [phase, setPhase] = useState<Phase>('choose')
  const [apiKey, setApiKey] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [focused, setFocused] = useState(0)

  const providerName = PROVIDER_NAMES[apiKeyEnv] ?? apiKeyEnv
  const keyUrl = PROVIDER_KEY_URLS[apiKeyEnv] ?? ''
  const masked = '*'.repeat(apiKey.length)

  async function submitKey(): Promise<void> {
    if (!apiKey.trim()) return
    setPhase('testing')
    const result = await testApiKey(apiKeyEnv, apiKey.trim())
    if (result.ok) {
      saveApiKey(apiKeyEnv, apiKey.trim())
      onConfigured()
    } else {
      setErrorMsg(result.error)
      setPhase('error')
    }
  }

  // ── choose ─────────────────────────────────────────────────────────────────
  if (phase === 'choose') {
    return (
      <Box flexDirection="column" gap={1} paddingX={2} paddingY={1}>
        <Text>{chalk.hex(NAVY).bold('Not configured')}</Text>
        <Text>
          <Text bold>{modelLabel}</Text>
          <Text dimColor> requires a </Text>
          <Text color={GOLD}>{providerName}</Text>
          <Text dimColor> API key</Text>
        </Text>
        {keyUrl ? <Text dimColor>Get a key at: {keyUrl}</Text> : null}

        <Box flexDirection="column" marginTop={1}>
          <Text color={focused === 0 ? GOLD : DIM} bold={focused === 0}>
            {focused === 0 ? '▶ ' : '  '}Help me configure — paste API key now
          </Text>
          <Text color={focused === 1 ? GOLD : DIM} bold={focused === 1}>
            {focused === 1 ? '▶ ' : '  '}I&apos;ll configure myself — set {apiKeyEnv} in my shell
          </Text>
        </Box>

        <Text dimColor>↑↓ move · Enter select · Esc back</Text>

        <KeyHandler
          onUp={() => setFocused(f => Math.max(0, f - 1))}
          onDown={() => setFocused(f => Math.min(1, f + 1))}
          onEnter={() => focused === 0 ? setPhase('enter-key') : onCancel()}
          onEsc={onCancel}
        />
      </Box>
    )
  }

  // ── enter-key ──────────────────────────────────────────────────────────────
  if (phase === 'enter-key') {
    return (
      <Box flexDirection="column" gap={1} paddingX={2} paddingY={1}>
        <Text>{chalk.hex(NAVY).bold(`Configure ${providerName}`)}</Text>
        <Text dimColor>Paste your API key (hidden) then press Enter</Text>

        <Box borderStyle="round" borderColor={NAVY} paddingX={1} marginTop={1}>
          <Text>{masked.length > 0 ? masked : chalk.dim('paste key here…')}</Text>
        </Box>

        <Text dimColor>Enter to test & save · Esc back</Text>

        <KeyHandler
          onChar={ch => {
            if (ch === '\b') setApiKey(k => k.slice(0, -1))
            else setApiKey(k => k + ch)
          }}
          onEnter={submitKey}
          onEsc={() => { setApiKey(''); setPhase('choose') }}
        />
      </Box>
    )
  }

  // ── testing ────────────────────────────────────────────────────────────────
  if (phase === 'testing') {
    return (
      <Box flexDirection="column" gap={1} paddingX={2} paddingY={1}>
        <Text>{chalk.hex(NAVY).bold(`Testing ${providerName} connection…`)}</Text>
        <Text dimColor>Sending a test request to verify your key</Text>
      </Box>
    )
  }

  // ── error ──────────────────────────────────────────────────────────────────
  return (
    <Box flexDirection="column" gap={1} paddingX={2} paddingY={1}>
      <Text color={RED} bold>✗  Connection failed</Text>
      <Text dimColor>{errorMsg}</Text>

      <Box flexDirection="column" marginTop={1}>
        <Text color={GOLD} bold>▶ Try a different key</Text>
        <Text dimColor>  Cancel</Text>
      </Box>

      <KeyHandler
        onEnter={() => { setApiKey(''); setPhase('enter-key') }}
        onEsc={onCancel}
      />
    </Box>
  )
}
