import { existsSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { useStartupNotification } from './useStartupNotification.js'

const PROVIDER_KEYS = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'GROK_API_KEY',
  'GLM_API_KEY',
  'GROQ_API_KEY',
  'DEEPSEEK_API_KEY',
  'QWEN_API_KEY',
]

function isAnyProviderConfigured(): boolean {
  // Check live env vars
  if (PROVIDER_KEYS.some(k => process.env[k])) return true
  // Check saved keys in ~/.intelligence360.env
  const envFile = join(homedir(), '.intelligence360.env')
  if (existsSync(envFile)) {
    const content = readFileSync(envFile, 'utf8')
    if (PROVIDER_KEYS.some(k => content.includes(`${k}=`))) return true
  }
  return false
}

export function useProviderSetupHint(): void {
  useStartupNotification(() => {
    if (isAnyProviderConfigured()) return null
    return {
      key: 'provider-setup-hint',
      text: 'No provider configured · Run /model to pick an AI provider and get started',
      color: 'suggestion',
      priority: 'high',
    }
  })
}
