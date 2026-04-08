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
 */

import Anthropic, { APIError } from '@anthropic-ai/sdk'
import type { BetaRawMessageStreamEvent } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import type { Stream } from '@anthropic-ai/sdk/streaming'
import OpenAI from 'openai'

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
  return parseModelPrefix(model) !== null
}

// ---------------------------------------------------------------------------
// Message format conversion — Anthropic → OpenAI
// ---------------------------------------------------------------------------

type AnthropicParams = Parameters<Anthropic['beta']['messages']['create']>[0]

function convertMessages(
  messages: AnthropicParams['messages'],
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const result: OpenAI.Chat.ChatCompletionMessageParam[] = []

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      result.push({ role: msg.role as 'user' | 'assistant', content: msg.content })
      continue
    }

    // Array content blocks
    const textParts: string[] = []
    for (const block of msg.content) {
      if (block.type === 'text') {
        textParts.push(block.text)
      } else if (block.type === 'tool_result') {
        // Tool result from user — map as tool message
        const toolContent = Array.isArray(block.content)
          ? block.content.filter((b: { type: string }) => b.type === 'text').map((b: { type: string; text?: string }) => b.type === 'text' ? (b.text ?? '') : '').join('\n')
          : typeof block.content === 'string'
            ? block.content
            : ''
        result.push({
          role: 'tool',
          tool_call_id: String(block.tool_use_id),
          content: toolContent,
        })
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
    } else if (textParts.length > 0) {
      result.push({
        role: msg.role as 'user' | 'assistant',
        content: textParts.join('\n'),
      })
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

    // system prompt
    if (params.system) {
      const systemText = typeof params.system === 'string'
        ? params.system
        : params.system.map((b: { type: string; text?: string }) => b.type === 'text' ? (b.text ?? '') : '').join('\n')
      if (systemText) messages.push({ role: 'system', content: systemText })
    }

    messages.push(...convertMessages(params.messages))

    const openAIParams: OpenAI.Chat.ChatCompletionCreateParamsStreaming = {
      model: modelId,
      messages,
      stream: true,
      max_tokens: params.max_tokens,
      ...(params.temperature !== undefined && { temperature: params.temperature }),
      ...(params.top_p !== undefined && { top_p: params.top_p }),
      ...(params.stop_sequences?.length && { stop: params.stop_sequences }),
    }

    const tools = convertTools(params.tools)
    if (tools?.length) {
      openAIParams.tools = tools
      openAIParams.tool_choice = 'auto'
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
        if (err && typeof err === 'object' && 'status' in err) {
          const e = err as { status: number; message: string; headers?: Headers }
          // Mark as non-retriable so withRetry gives up immediately instead of
          // retrying 10 times (bad API keys won't fix themselves on retry).
          const headers = new Headers(e.headers)
          headers.set('x-should-retry', 'false')
          throw new APIError(e.status, { error: { message: e.message } }, e.message, headers)
        }
        throw err
      }
    }

    const result = Object.assign(
      Promise.resolve({
        [Symbol.asyncIterator]: async function* () {
          const inner = await withResponse()
          yield* inner.data as AsyncIterable<unknown>
        },
        controller: {},
      }),
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
