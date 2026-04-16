/**
 * Provider setup utilities — save API keys and test connections.
 * Keys are persisted to ~/.intelligence360.env which is sourced by intelligence360.sh
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import OpenAI from 'openai'

const ENV_FILE = join(homedir(), '.intelligence360.env')

export type TestResult = { ok: true } | { ok: false; error: string }

/** Save an API key to ~/.intelligence360.env */
export function saveApiKey(envVar: string, value: string): void {
  let content = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : ''
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith(`${envVar}=`))
  lines.push(`${envVar}=${value}`)
  writeFileSync(ENV_FILE, lines.join('\n') + '\n', { mode: 0o600 })
  // Also set in current process so it's usable immediately
  process.env[envVar] = value
}

// Provider configs for connection testing
const TEST_CONFIGS: Record<string, { baseURL: string; model: string }> = {
  OPENAI_API_KEY:   { baseURL: 'https://api.openai.com/v1',                              model: 'gpt-4o-mini' },
  GROK_API_KEY:     { baseURL: 'https://api.x.ai/v1',                                    model: 'grok-3-mini' },
  GEMINI_API_KEY:   { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash' },
  GLM_API_KEY:      { baseURL: 'https://api.z.ai/api/coding/paas/v4',                    model: 'glm-5-turbo' },
  GROQ_API_KEY:     { baseURL: 'https://api.groq.com/openai/v1',                         model: 'llama-3.1-8b-instant' },
  DEEPSEEK_API_KEY: { baseURL: 'https://api.deepseek.com/v1',                            model: 'deepseek-chat' },
  QWEN_API_KEY:     { baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', model: 'qwen3.5-flash' },
}

/** Test an API key by sending a minimal 1-token completion. Returns ok or error message. */
export async function testApiKey(envVar: string, apiKey: string): Promise<TestResult> {
  const cfg = TEST_CONFIGS[envVar]
  if (!cfg) return { ok: false, error: `Unknown provider for ${envVar}` }

  try {
    const client = new OpenAI({ apiKey, baseURL: cfg.baseURL })
    await client.chat.completions.create({
      model: cfg.model,
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 1,
    })
    return { ok: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid api key')) {
      return { ok: false, error: 'Invalid API key — authentication failed' }
    }
    if (msg.includes('403')) {
      return { ok: false, error: 'Access denied — check your plan/permissions' }
    }
    return { ok: false, error: msg.split('\n')[0]!.slice(0, 120) }
  }
}

/** Human-readable provider names */
export const PROVIDER_NAMES: Record<string, string> = {
  OPENAI_API_KEY:   'OpenAI',
  GROK_API_KEY:     'xAI (Grok)',
  GEMINI_API_KEY:   'Google Gemini',
  GLM_API_KEY:      'Zhipu AI (GLM)',
  GROQ_API_KEY:     'Groq (Llama)',
  DEEPSEEK_API_KEY: 'DeepSeek',
  QWEN_API_KEY:     'Alibaba Qwen',
}

/** Where to get an API key for each provider */
export const PROVIDER_KEY_URLS: Record<string, string> = {
  OPENAI_API_KEY:   'platform.openai.com/api-keys',
  GROK_API_KEY:     'console.x.ai',
  GEMINI_API_KEY:   'aistudio.google.com/apikey',
  GLM_API_KEY:      'open.bigmodel.cn/usercenter/apikeys',
  GROQ_API_KEY:     'console.groq.com/keys',
  DEEPSEEK_API_KEY: 'platform.deepseek.com/api_keys',
  QWEN_API_KEY:     'dashscope.aliyuncs.com',
}
