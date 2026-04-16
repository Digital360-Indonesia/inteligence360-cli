/**
 * Multi-model adapter — wraps OpenAI-compatible providers behind the
 * Anthropic SDK interface so the rest of the codebase stays unchanged.
 *
 * Supported provider prefixes (use with --model flag):
 *   openai:gpt-4o
 *   gemini:gemini-2.0-flash
 *   grok:grok-3
 *   glm:glm-4-plus
 *   qwen:qwen-max
 *   minimax:MiniMax-M2.7  (Anthropic-compatible endpoint)
 */

import Anthropic, { APIError } from '@anthropic-ai/sdk'
import type { BetaRawMessageStreamEvent } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import type { Stream } from '@anthropic-ai/sdk/streaming'
import OpenAI from 'openai'
import { logForDebugging } from '../../utils/debug.js'

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

type ProviderConfig = {
  baseURL: string
  apiKeyEnv: string
  defaultApiKey?: string
}

const PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
  },
  gemini: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKeyEnv: 'GEMINI_API_KEY',
  },
  grok: {
    baseURL: 'https://api.x.ai/v1',
    apiKeyEnv: 'GROK_API_KEY',
  },
  glm: {
    baseURL: 'https://api.z.ai/api/coding/paas/v4',
    apiKeyEnv: 'GLM_API_KEY',
  },
  llama: {
    baseURL: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
  },
  deepseek: {
    baseURL: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
  },
  qwen: {
    baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'QWEN_API_KEY',
  },
}

// Map UI model IDs to actual provider API model IDs
function mapModelIdForProvider(provider: string, modelId: string): string {
  // Gemini's OpenAI-compatible endpoint expects plain model IDs, not `models/...`.
  if (provider === 'gemini') {
    const geminiMapping: Record<string, string> = {
      'gemini-3.1-pro-preview': 'gemini-3.1-pro-preview',
      'gemini-3.1-flash-live-preview': 'gemini-3.1-flash-live-preview',
      'gemini-3-flash-preview': 'gemini-3-flash-preview',
      'gemini-2.5-pro': 'gemini-2.5-pro',
      'gemini-2.5-flash': 'gemini-2.5-flash',
    }
    return geminiMapping[modelId] || modelId
  }

  // OpenAI GPT-5 uses different model IDs for API
  if (provider === 'openai' && modelId.includes('gpt-5')) {
    return modelId
  }

  // Default: use as-is
  return modelId
}

// ---------------------------------------------------------------------------
// Provider detection
// ---------------------------------------------------------------------------

export function parseModelPrefix(model: string): { provider: string; modelId: string } | null {
  const idx = model.indexOf(':')
  if (idx === -1) return null
  const provider = model.slice(0, idx)
  const modelId = model.slice(idx + 1)
  if (!PROVIDERS[provider]) return null
  return { provider, modelId }
}

export function isThirdPartyModel(model: string | undefined): boolean {
  if (!model) return false
  if (model.startsWith('minimax:')) return true
  return parseModelPrefix(model) !== null
}

// ---------------------------------------------------------------------------
// Message format conversion — Anthropic → OpenAI
// ---------------------------------------------------------------------------

type AnthropicParams = Parameters<Anthropic['beta']['messages']['create']>[0]

function convertMessages(
  messages: AnthropicParams['messages'],
  isGemini: boolean = false,
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const result: OpenAI.Chat.ChatCompletionMessageParam[] = []

  // Pre-scan: collect every tool_use_id that has a matching tool_result anywhere
  // in the message list. Used below to avoid injecting stub responses for tool
  // calls that DO have a real response later in the conversation.
  const toolResultIds = new Set<string>()
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'tool_result' && block.tool_use_id) {
          toolResultIds.add(String(block.tool_use_id))
        }
      }
    }
  }

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      result.push({ role: msg.role as 'user' | 'assistant', content: msg.content })
      continue
    }

    // Array content blocks
    const textParts: string[] = []
    // Collect tool_result messages in a buffer so they are flushed AFTER the
    // user's text message (if any), preserving the correct ordering:
    //   user-text → tool(result1) → tool(result2)
    const toolResultBuffer: OpenAI.Chat.ChatCompletionMessageParam[] = []

    for (const block of msg.content) {
      if (block.type === 'text') {
        textParts.push(block.text)
      } else if (block.type === 'tool_result') {
        const toolContent = Array.isArray(block.content)
          ? block.content.filter((b: { type: string }) => b.type === 'text').map((b: { type: string; text?: string }) => b.type === 'text' ? (b.text ?? '') : '').join('\n')
          : typeof block.content === 'string'
            ? block.content
            : ''

        if (isGemini) {
          // Gemini's OpenAI-compatible endpoint does not accept standalone `tool`
          // role messages — fold tool results back into the user turn as text.
          textParts.push(toolContent)
        } else {
          toolResultBuffer.push({
            role: 'tool',
            tool_call_id: String(block.tool_use_id),
            content: toolContent,
          })
        }
        continue
      } else if (block.type === 'tool_use') {
        // Tool call from assistant — handled below
      }
    }

    // Handle assistant messages with tool_use blocks
    const toolUseCalls = Array.isArray(msg.content)
      ? msg.content.filter((b: { type: string }) => b.type === 'tool_use')
      : []

    if (toolUseCalls.length > 0) {
      if (isGemini) {
        // Gemini: emit tool_calls normally — Gemini supports function calling
        // but tool responses must come back as user text, not `tool` role.
        result.push({
          role: 'assistant',
          content: textParts.join('\n') || null,
          tool_calls: toolUseCalls.map((b: { type: string; id?: string; name?: string; input?: unknown }) => ({
            id: b.id ?? '',
            type: 'function' as const,
            function: {
              name: b.name ?? '',
              arguments: JSON.stringify(b.input ?? {}),
            },
          })),
        } as OpenAI.Chat.ChatCompletionMessageParam)
      } else {
        const toolCallParams = toolUseCalls.map((b: { type: string; id?: string; name?: string; input?: unknown }) => ({
          id: b.id ?? '',
          type: 'function' as const,
          function: {
            name: b.name ?? '',
            arguments: JSON.stringify(b.input ?? {}),
          },
        }))
        result.push({
          role: 'assistant',
          content: textParts.join('\n') || null,
          tool_calls: toolCallParams,
        } as OpenAI.Chat.ChatCompletionMessageParam)

        // Inject stub responses immediately after this assistant message for
        // any tool_call that has NO matching tool_result anywhere in the
        // conversation (orphaned calls at the end of a cut-off session).
        // We use the pre-scanned toolResultIds set so we never inject a stub
        // for a call that has a real response coming later in the loop —
        // that would create duplicate tool responses and cause a 400.
        for (const tc of toolCallParams) {
          if (!toolResultIds.has(tc.id)) {
            result.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: '',
            })
          }
        }
      }
    } else if (textParts.length > 0 || toolResultBuffer.length > 0) {
      // Emit user text first (if any), then tool result messages after.
      if (textParts.length > 0) {
        result.push({
          role: msg.role as 'user' | 'assistant',
          content: textParts.join('\n'),
        })
      }
      // Flush buffered tool_result messages (non-Gemini path)
      result.push(...toolResultBuffer)
    }
  }

  return result
}

function convertTools(
  tools: AnthropicParams['tools'],
): OpenAI.Chat.ChatCompletionTool[] | undefined {
  if (!tools || tools.length === 0) return undefined
  return tools.map(tool => {
    if ('type' in tool && tool.type !== 'custom') return undefined
    const t = tool as { name: string; description?: string; input_schema: object }
    return {
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }
  }).filter(Boolean) as OpenAI.Chat.ChatCompletionTool[]
}

// ---------------------------------------------------------------------------
// Stream conversion — OpenAI SSE → Anthropic BetaRawMessageStreamEvent
// ---------------------------------------------------------------------------

async function* openAIStreamToAnthropic(
  openAIStream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>,
  modelId: string,
): AsyncGenerator<BetaRawMessageStreamEvent> {
  const messageId = `msg_${Date.now()}`
  let inputTokens = 0
  let outputTokens = 0
  let hasEmittedStart = false
  let hasEmittedContentStart = false
  let currentToolCallIndex = -1
  const toolCallIds: Record<number, string> = {}
  const toolCallNames: Record<number, string> = {}

  for await (const chunk of openAIStream) {
    if (!hasEmittedStart) {
      hasEmittedStart = true
      yield {
        type: 'message_start',
        message: {
          id: messageId,
          type: 'message',
          role: 'assistant',
          content: [],
          model: modelId,
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 },
        },
      } as BetaRawMessageStreamEvent
    }

    const choice = chunk.choices?.[0]
    if (!choice) continue

    const delta = choice.delta

    // Text content
    if (delta.content) {
      if (!hasEmittedContentStart) {
        hasEmittedContentStart = true
        yield {
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'text', text: '' },
        } as BetaRawMessageStreamEvent
      }
      yield {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: delta.content },
      } as BetaRawMessageStreamEvent
    }

    // Tool calls
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index ?? 0
        const blockIndex = idx + (hasEmittedContentStart ? 1 : 0)

        if (idx !== currentToolCallIndex && tc.id) {
          currentToolCallIndex = idx
          toolCallIds[idx] = tc.id
          toolCallNames[idx] = tc.function?.name ?? ''
          yield {
            type: 'content_block_start',
            index: blockIndex,
            content_block: {
              type: 'tool_use',
              id: tc.id,
              name: tc.function?.name ?? '',
              input: {},
            },
          } as BetaRawMessageStreamEvent
        }

        if (tc.function?.arguments) {
          yield {
            type: 'content_block_delta',
            index: blockIndex,
            delta: { type: 'input_json_delta', partial_json: tc.function.arguments },
          } as BetaRawMessageStreamEvent
        }
      }
    }

    // Usage
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens ?? 0
      outputTokens = chunk.usage.completion_tokens ?? 0
    }

    // Stop
    if (choice.finish_reason) {
      if (hasEmittedContentStart) {
        yield { type: 'content_block_stop', index: 0 } as BetaRawMessageStreamEvent
      }
      // Stop any open tool call blocks
      for (const idx of Object.keys(toolCallIds)) {
        const blockIndex = Number(idx) + (hasEmittedContentStart ? 1 : 0)
        yield { type: 'content_block_stop', index: blockIndex } as BetaRawMessageStreamEvent
      }

      const stopReason =
        choice.finish_reason === 'tool_calls'
          ? 'tool_use'
          : choice.finish_reason === 'length'
            ? 'max_tokens'
            : 'end_turn'

      yield {
        type: 'message_delta',
        delta: { stop_reason: stopReason, stop_sequence: null },
        usage: { output_tokens: outputTokens },
      } as BetaRawMessageStreamEvent

      yield {
        type: 'message_stop',
      } as BetaRawMessageStreamEvent
    }
  }

  // Ensure we always emit message_stop if stream ended without finish_reason
  if (!hasEmittedStart) {
    // Empty stream — emit minimal valid sequence
    yield {
      type: 'message_start',
      message: {
        id: messageId,
        type: 'message',
        role: 'assistant',
        content: [],
        model: modelId,
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: inputTokens, output_tokens: outputTokens },
      },
    } as BetaRawMessageStreamEvent
    yield { type: 'message_stop' } as BetaRawMessageStreamEvent
  }
}

// ---------------------------------------------------------------------------
// Duck-typed Anthropic client wrapper
// ---------------------------------------------------------------------------

/**
 * Creates an object that mimics the shape of `Anthropic` that the rest of the
 * codebase calls (specifically `anthropic.beta.messages.create(...).withResponse()`).
 */
export function createOpenAICompatibleClient(
  provider: string,
  modelId: string,
): Anthropic {
  const config = PROVIDERS[provider]
  if (!config) throw new Error(`Unknown provider: ${provider}`)

  const apiKey = process.env[config.apiKeyEnv]
  if (!apiKey) {
    throw new Error(
      `Missing API key for provider "${provider}". Set the ${config.apiKeyEnv} environment variable.`,
    )
  }

  const openai = new OpenAI({ apiKey, baseURL: config.baseURL })

  // Build the streaming call that .withResponse() expects
  const createStream = (
    params: AnthropicParams,
    _options?: { signal?: AbortSignal; headers?: Record<string, string> },
  ) => {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []
    const isGemini = provider === 'gemini'

    // system prompt — prepend a conciseness directive so third-party models
    // behave like Claude: direct, terse, no preamble, no trailing summaries.
    const THIRD_PARTY_PREFIX =
      'You are a senior software engineer assistant. ' +
      'Be extremely concise and direct. ' +
      'Skip all preamble, affirmations ("Sure!", "Great question!"), and trailing summaries. ' +
      'Give the solution or answer immediately. ' +
      'When writing code, output only the code and the minimum explanation needed. ' +
      'Match the response length to the complexity of the request — simple questions get one-line answers.\n\n'

    if (params.system) {
      const systemText = typeof params.system === 'string'
        ? params.system
        : params.system.map((b: { type: string; text?: string }) => b.type === 'text' ? (b.text ?? '') : '').join('\n')
      if (systemText) messages.push({ role: 'system', content: THIRD_PARTY_PREFIX + systemText })
    } else {
      messages.push({ role: 'system', content: THIRD_PARTY_PREFIX })
    }

    messages.push(...convertMessages(params.messages, isGemini))

    // Provider-specific parameter mapping
    let maxTokensField = 'max_tokens'
    let maxTokensValue = params.max_tokens

    // OpenAI GPT-5 models use max_completion_tokens instead of max_tokens.
    // Also cap at 8192 to avoid inflating TPM usage and triggering 429s.
    if (provider === 'openai' && modelId.includes('gpt-5')) {
      maxTokensField = 'max_completion_tokens'
      if (!maxTokensValue || maxTokensValue > 8192) maxTokensValue = 8192
    }

    // Gemini's OpenAI-compatible endpoint is stricter about unsupported fields.
    // Keep the payload minimal and avoid large output limits that can trigger 400s.
    if (isGemini && maxTokensValue && maxTokensValue > 4096) {
      maxTokensValue = 4096
    }

    // deepseek-reasoner (R1) does not support tools or temperature.
    const isDeepSeekReasoner = provider === 'deepseek' && modelId === 'deepseek-reasoner'

    const openAIParams: any = {
      model: mapModelIdForProvider(provider, modelId),
      messages,
      stream: true,
      [maxTokensField]: maxTokensValue,
      // Use upstream temperature if provided, otherwise default to 0.2 for focused
      // responses. Skip for Gemini (rejects unknown params) and DeepSeek reasoner.
      ...(!isGemini && !isDeepSeekReasoner && { temperature: params.temperature ?? 0.2 }),
      ...(params.top_p !== undefined && { top_p: params.top_p }),
      ...(params.stop_sequences?.length && { stop: params.stop_sequences }),
    }

    const tools = convertTools(params.tools)
    if (tools?.length && !isDeepSeekReasoner) {
      openAIParams.tools = tools
      openAIParams.tool_choice = 'auto'
    }

    if (isGemini) {
      const debugPayload = {
        model: openAIParams.model,
        stream: openAIParams.stream,
        messageCount: Array.isArray(messages) ? messages.length : 0,
        roles: Array.isArray(messages) ? messages.map(message => message.role) : [],
        openAIRoles: Array.isArray(openAIParams.messages)
          ? openAIParams.messages.map((message: { role?: string }) => message.role ?? 'unknown')
          : [],
        hasSystemPrompt: Boolean(params.system),
        systemLength:
          typeof params.system === 'string'
            ? params.system.length
            : Array.isArray(params.system)
              ? params.system
                  .filter((block: { type: string; text?: string }) => block.type === 'text')
                  .reduce((total: number, block: { type: string; text?: string }) => total + (block.text?.length ?? 0), 0)
              : 0,
        maxTokensField,
        maxTokensValue,
        temperature: openAIParams.temperature ?? null,
        topP: openAIParams.top_p ?? null,
        stopCount: Array.isArray(openAIParams.stop) ? openAIParams.stop.length : 0,
        toolCount: Array.isArray(openAIParams.tools) ? openAIParams.tools.length : 0,
        approxMessageChars: Array.isArray(messages)
          ? messages.reduce((total: number, message: { content?: unknown }) => {
              if (typeof message.content === 'string') return total + message.content.length
              if (Array.isArray(message.content)) {
                return total + message.content.reduce((inner: number, block: { text?: string }) => inner + (block.text?.length ?? 0), 0)
              }
              return total
            }, 0)
          : 0,
      }
      logForDebugging(`[multimodel][gemini] request ${JSON.stringify(debugPayload)}`)
    }

    // The Anthropic SDK's .withResponse() returns { data: Stream, request_id, response }
    // We eagerly start the request inside withResponse() so auth/network errors
    // surface there and are caught by withRetry — not during stream iteration
    // (which would trigger the non-streaming fallback with an incompatible client).
    const withResponse = async () => {
      const openAIStream = openai.chat.completions.stream(openAIParams)

      // Peek at the first chunk so HTTP errors (401, 429, etc.) surface here
      // rather than during stream iteration. We replay the peeked chunk into
      // the Anthropic event generator by prepending it to the remaining iterator.
      let firstChunk: OpenAI.Chat.ChatCompletionChunk | undefined
      try {
        const iter = openAIStream[Symbol.asyncIterator]()
        const first = await iter.next()
        if (!first.done) firstChunk = first.value
        // Reconstruct an iterable that yields firstChunk then the rest
        const remaining = iter

        async function* fullStream(): AsyncGenerator<OpenAI.Chat.ChatCompletionChunk> {
          if (firstChunk !== undefined) yield firstChunk
          let next
          while (!(next = await remaining.next()).done) {
            yield next.value
          }
        }

        const anthropicStream = {
          [Symbol.asyncIterator]: async function* () {
            yield* openAIStreamToAnthropic(fullStream(), modelId)
          },
          controller: {},
        }

        return {
          data: anthropicStream,
          request_id: undefined as string | undefined,
          response: new Response(null, { status: 200 }),
        }
      } catch (err: unknown) {
        if (isGemini) {
          const debugError =
            err instanceof Error
              ? { name: err.name, message: err.message, stack: err.stack }
              : err
          logForDebugging(`[multimodel][gemini] error ${JSON.stringify(debugError)}`, {
            level: 'error',
          })
        }
        if (err && typeof err === 'object' && 'status' in err) {
          const e = err as { status: number; message: string; headers?: Headers }
          const headers = new Headers(e.headers)
          // 429 (rate limit) and 529 (overloaded) are transient — let withRetry
          // back off and retry normally. For everything else (401 bad key, 403,
          // 400 bad request, etc.) mark as non-retriable so we don't loop 10x.
          const isTransient = e.status === 429 || e.status === 529
          if (!isTransient) {
            headers.set('x-should-retry', 'false')
          }
          throw new APIError(e.status, { error: { message: e.message } }, e.message, headers)
        }
        throw err
      }
    }

    // When awaited directly (non-streaming path, e.g. sideQuery / yoloClassifier),
    // collect the stream into a proper BetaMessage-shaped object so callers can
    // access response.usage, response.content, etc. without crashing.
    const nonStreamingPromise = withResponse().then(async ({ data }) => {
      const content: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }> = []
      let inputTokens = 0
      let outputTokens = 0
      let stopReason: string | null = null
      let messageId = `msg_${Math.random().toString(36).slice(2)}`
      let currentText = ''
      let currentToolId = ''
      let currentToolName = ''
      let currentToolInput = ''

      for await (const event of data as AsyncIterable<BetaRawMessageStreamEvent>) {
        if (event.type === 'message_start') {
          messageId = event.message?.id ?? messageId
          inputTokens = event.message?.usage?.input_tokens ?? 0
          outputTokens = event.message?.usage?.output_tokens ?? 0
        } else if (event.type === 'content_block_start') {
          const block = (event as { type: string; content_block?: { type: string; text?: string; id?: string; name?: string } }).content_block
          if (block?.type === 'tool_use') {
            currentToolId = block.id ?? ''
            currentToolName = block.name ?? ''
            currentToolInput = ''
          } else {
            currentText = ''
          }
        } else if (event.type === 'content_block_delta') {
          const delta = (event as { type: string; delta?: { type: string; text?: string; partial_json?: string } }).delta
          if (delta?.type === 'text_delta') currentText += delta.text ?? ''
          else if (delta?.type === 'input_json_delta') currentToolInput += delta.partial_json ?? ''
        } else if (event.type === 'content_block_stop') {
          if (currentToolId) {
            let parsedInput: unknown = {}
            try { parsedInput = JSON.parse(currentToolInput) } catch {}
            content.push({ type: 'tool_use', id: currentToolId, name: currentToolName, input: parsedInput })
            currentToolId = ''
            currentToolName = ''
            currentToolInput = ''
          } else if (currentText) {
            content.push({ type: 'text', text: currentText })
            currentText = ''
          }
        } else if (event.type === 'message_delta') {
          const ev = event as { type: string; delta?: { stop_reason?: string | null }; usage?: { output_tokens?: number } }
          stopReason = ev.delta?.stop_reason ?? stopReason
          if (ev.usage?.output_tokens) outputTokens = ev.usage.output_tokens
        }
      }

      return {
        id: messageId,
        type: 'message' as const,
        role: 'assistant' as const,
        content,
        model: modelId,
        stop_reason: stopReason,
        stop_sequence: null,
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
      }
    })

    const result = Object.assign(
      nonStreamingPromise,
      { withResponse },
    )

    return result
  }

  // Construct a minimal duck-typed Anthropic-like object
  const duck = {
    beta: {
      messages: {
        create: createStream,
      },
    },
  }

  return duck as unknown as Anthropic
}

// ---------------------------------------------------------------------------
// MiniMax — Anthropic-compatible endpoint
// ---------------------------------------------------------------------------

/**
 * Creates a duck-typed Anthropic client for MiniMax's Anthropic-compatible
 * endpoint. Unlike OpenAI-compatible providers, MiniMax speaks the native
 * Anthropic API format, so we use the real Anthropic SDK and only need to
 * strip the `minimax:` prefix from the model string before sending.
 */
export function createMinimaxClient(modelId: string): Anthropic {
  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) {
    throw new Error('Missing API key for MiniMax. Set the MINIMAX_API_KEY environment variable.')
  }

  const client = new Anthropic({
    apiKey,
    baseURL: 'https://api.minimax.io/anthropic',
    defaultHeaders: { 'anthropic-version': '2023-06-01' },
  })

  // Intercept beta.messages.create to strip the `minimax:` prefix from model
  const originalCreate = client.beta.messages.create.bind(client.beta.messages)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patchedCreate = (params: any, options?: any) => {
    const patchedParams = Object.assign({}, params, {
      model: typeof params.model === 'string' ? params.model.replace(/^minimax:/, '') : params.model,
    })
    return originalCreate(patchedParams, options)
  }

  const duck = {
    beta: {
      messages: {
        create: patchedCreate,
      },
    },
  }

  return duck as unknown as Anthropic
}
