Claude Code CLI — Deep Architectural Analysis

  1. Project Overview

  1,904 TypeScript/TSX files organized in a flat-ish src/ directory. No package.json, tsconfig.json, or build config at the root — this is the extracted source
  from the distributed bundle. Built on Bun runtime + a custom fork of Ink (React-for-terminals).

  ---
  2. Entry Point — main.tsx

  Role: CLI bootstrap, Commander.js argument parsing, startup orchestration.

  Key observations:
  - Performance-obsessed startup: Parallel prefetch of MDM config, keychain credentials, and module loading (~135ms budget mentioned in comments)
  - Feature flags via bun:bundle: feature('COORDINATOR_MODE'), feature('KAIROS'), feature('REACTIVE_COMPACT') etc. control dead code elimination at build time —
  Anthropic ships different feature sets to internal vs external users
  - USER_TYPE === 'ant': Internal Anthropic builds get extra tools (REPLTool, ConfigTool, TungstenTool, SuggestBackgroundPRTool)
  - Lazy require() for circular dependency breaks: Teammate, coordinator, and assistant modules use deferred imports to avoid cycles
  - Provider support: References to AWS Bedrock, GCP Vertex, first-party Anthropic API, OAuth flows — the multi-provider setup is already there

  ---
  3. Query Engine — QueryEngine.ts + query.ts

  Role: The brain. Owns the conversation lifecycle — message construction, API calls, streaming, tool use loop, compaction.

  QueryEngine class (headless/SDK path):

  QueryEngineConfig {
    cwd, tools, commands, mcpClients, agents,
    canUseTool, getAppState, setAppState,
    initialMessages, readFileCache,
    customSystemPrompt, appendSystemPrompt,
    userSpecifiedModel, fallbackModel,
    thinkingConfig, maxTurns, maxBudgetUsd,
    taskBudget, jsonSchema, abortController, ...
  }
  - Stateful: holds mutableMessages[], permissionDenials[], totalUsage, readFileState
  - Per-turn: submitMessage() starts a new turn within the same conversation
  - Supports snip compaction (HISTORY_SHIP feature) for long headless sessions

  query.ts (REPL path):

  - Same logic but wrapped for the interactive terminal session
  - Handles slash commands, message queue management, skill discovery, memory attachment filtering
  - Compaction: auto-compact, reactive-compact, context-collapse (all feature-gated)

  Anthropic-specific coupling:
  - Uses @anthropic-ai/sdk types throughout (BetaMessage, BetaRawMessageStreamEvent, etc.)
  - ContentBlockParam, ToolResultBlockParam, ToolUseBlockParam — Anthropic message format
  - Beta headers for prompt caching, structured outputs, context management, etc.

  ---
  4. Tool System — Tool.ts + tools.ts + tools/

  Role: The hands. ~30+ permission-gated tools, each in its own directory.

  Tool.ts — Base interface:

  - ToolInputJSONSchema — JSON Schema for tool inputs
  - ToolUseContext — massive context object passed to every tool execution (app state, permissions, MCP connections, file cache, agents, etc.)
  - toolMatchesName() — fuzzy matching for tool names
  - Tools = Tool[] type alias

  tools.ts — Tool registry:

  The getAllBaseTools() function is the source of truth for all tools:

  ┌────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────┐
  │                 Core Tools (always available)                  │                  Conditional Tools                   │
  ├────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ AgentTool, BashTool, FileReadTool, FileEditTool, FileWriteTool │ LSPTool (ENABLE_LSP_TOOL env)                        │
  ├────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ GlobTool, GrepTool (unless embedded search)                    │ EnterWorktreeTool/ExitWorktreeTool                   │
  ├────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ NotebookEditTool, WebFetchTool, WebSearchTool                  │ TeamCreateTool/TeamDeleteTool (swarms)               │
  ├────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ AskUserQuestionTool, SkillTool, TodoWriteTool                  │ WorkflowTool (WORKFLOW_SCRIPTS)                      │
  ├────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ ExitPlanModeV2Tool, EnterPlanModeTool                          │ SleepTool, CronCreate/Delete/List (PROACTIVE/KAIROS) │
  ├────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ TaskStopTool, BriefTool                                        │ WebBrowserTool, MonitorTool, PowerShellTool          │
  ├────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────┤
  │ ListMcpResourcesTool, ReadMcpResourceTool                      │ SnipTool, ListPeersTool (UDS_INBOX)                  │
  └────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────┘

  getTools(permissionContext): Filters tools by:
  1. Simple mode (CLAUDE_CODE_SIMPLE env) → only Bash, Read, Edit
  2. REPL mode → hides primitives, exposes REPLTool
  3. Permission deny rules — per-tool blanket deny support
  4. MCP tools added dynamically at runtime

  Customization notes: The tool system is well-abstracted. Each tool implements a common Tool interface. Adding non-Anthropic model support would require no tool
  changes — tools are model-agnostic.

  ---
  5. API Layer — services/api/claude.ts

  Role: Direct communication with the Anthropic Messages API.

  Key coupling points:
  - @anthropic-ai/sdk — all API types are from this SDK
  - Beta headers: PROMPT_CACHING_SCOPE_BETA_HEADER, STRUCTURED_OUTPUTS_BETA_HEADER, CONTEXT_MANAGEMENT_BETA_HEADER, EFFORT_BETA_HEADER, FAST_MODE_BETA_HEADER, etc.
  - Streaming: Uses Anthropic's SSE stream format
  - Model selection: getDefaultOpusModel(), getDefaultSonnetModel(), getSmallFastModel() — all resolve to Anthropic model strings
  - Multi-provider: getAPIProvider() distinguishes between first-party, Bedrock, and Vertex
  - Cost tracking: calculateUSDCost() per model, addToTotalSessionCost()
  - Context management: Token counting, max output tokens per model, 1M context support

  This is the #1 file to swap for multi-model support — it's the API boundary.

  ---
  6. Memory System — memdir/

  Role: Persistent, file-based memory across sessions.

  Key design:
  - MEMORY.md = index file (max 200 lines, 25KB) with pointers to topic files
  - truncateEntrypointContent() enforces hard limits
  - loadMemoryPrompt() builds the memory section injected into the system prompt
  - findRelevantMemories.ts — on-demand relevance search
  - memoryTypes.ts — defines the frontmatter schema, trust/recall rules, what NOT to save
  - Team memory support via teamMemPaths.ts (feature-gated)

  Clever aspects:
  - Memory is re-read on every iteration (not just session start)
  - Auto-compaction: old/large memories get summarized
  - "Dreaming" background task (services/autoDream/) consolidates memories

  ---
  7. Model Layer — utils/model/

  Role: Model resolution, aliases, provider detection.

  - model.ts: getUserSpecifiedModelSetting() with priority: session override > --model flag > ANTHROPIC_MODEL env > saved settings
  - modelStrings.ts: Model codenames (gated behind USER_TYPE === 'ant' for dead code elimination)
  - providers.ts: getAPIProvider() — returns 'first-party', 'bedrock', 'vertex', or 'custom'
  - aliases.ts: Model aliases (e.g., "opus" → latest Opus model ID)
  - modelAllowlist.ts: Restricts which models can be used
  - modelCost.ts: Per-model pricing for cost tracking

  Multi-model fork note: The provider abstraction already exists but is Anthropic-specific. You'd need to:
  1. Abstract the API client in services/api/claude.ts
  2. Create adapter interfaces for OpenAI/Gemini/Grok message formats
  3. Handle different tool-calling schemas (Anthropic vs OpenAI function calling)
  4. Deal with thinking/extended-thinking being Anthropic-only

  ---
  8. Feature Flag System

  bun:bundle feature() function — compile-time feature flags eliminated via dead code elimination. Key flags seen:

  ┌───────────────────────────┬───────────────────────────────────────┐
  │           Flag            │                Purpose                │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ COORDINATOR_MODE          │ Multi-agent coordinator               │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ KAIROS                    │ Assistant/proactive mode              │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ PROACTIVE                 │ Proactive tool use                    │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ REACTIVE_COMPACT          │ Reactive context compaction           │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ CONTEXT_COLLAPSE          │ Context window management             │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ AGENT_TRIGGERS            │ Cron/scheduled tasks                  │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ WORKFLOW_SCRIPTS          │ Workflow automation                   │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ WEB_BROWSER_TOOL          │ Browser automation                    │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ UDS_INBOX                 │ Unix domain socket peer communication │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ HISTORY_SNIP              │ History snip compaction               │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ EXPERIMENTAL_SKILL_SEARCH │ Skill search                          │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ TEMPLATES                 │ Job classification                    │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ TEAMMEM                   │ Team memory                           │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ MONITOR_TOOL              │ Monitoring tool                       │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ CACHED_MICROCOMPACT       │ Cached compact                        │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ TERMINAL_PANEL            │ Terminal panel UI                     │
  ├───────────────────────────┼───────────────────────────────────────┤
  │ OVERFLOW_TEST_TOOL        │ Testing tool                          │
  └───────────────────────────┴───────────────────────────────────────┘

  ---
  9. Multi-Agent Orchestration

  Three modes visible:
  1. Fork subagents (tools/AgentTool/forkSubagent.ts) — byte-identical copy with prompt cache sharing
  2. Teammate mode (utils/swarm/) — file-based mailbox communication
  3. Worktree mode (utils/worktree*.ts) — isolated git branches
  4. Coordinator mode (coordinator/coordinatorMode.ts, 19KB) — parallel task distribution

  Task types from Task.ts: local_bash, local_agent, remote_agent, in_process_teammate, local_workflow, monitor_mcp, dream

  ---
  10. System Prompt Construction — constants/prompts.ts (54KB)

  Builds the massive system prompt injected with every API call. Includes:
  - Tool instructions (per-tool prompt text)
  - Memory sections (loaded from memdir/)
  - Output style config
  - Git/workspace context
  - MCP server instructions
  - Undercover mode support
  - Scratchpad instructions
  - Agent-specific instructions (explore agent, etc.)

  Uses a systemPromptSection / resolveSystemPromptSections abstraction for caching boundaries.

  ---
  11. Summary: Key Files for Multi-Model Fork

  ┌──────────┬──────────────────────────────────────┬─────────────────────────────────────────────────────────────────┐
  │ Priority │                 File                 │                               Why                               │
  ├──────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ P0       │ services/api/claude.ts               │ The API boundary — all Anthropic SDK calls go here              │
  ├──────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ P0       │ utils/model/model.ts + providers.ts  │ Model resolution and provider detection                         │
  ├──────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ P0       │ utils/api.ts                         │ Message formatting for API (tool schemas, cache scopes)         │
  ├──────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ P1       │ QueryEngine.ts + query.ts            │ Consumes API types, would need adapter interfaces               │
  ├──────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ P1       │ Tool.ts                              │ Tool schema format is Anthropic-specific                        │
  ├──────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ P1       │ constants/prompts.ts                 │ System prompt construction assumes Anthropic format             │
  ├──────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ P2       │ utils/messages.ts                    │ Message normalization, creates Anthropic-specific message types │
  ├──────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ P2       │ utils/thinking.ts                    │ Extended thinking is Anthropic-only                             │
  ├──────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ P2       │ utils/betas.ts                       │ Beta header management                                          │
  ├──────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ P3       │ services/compact/                    │ Compaction logic assumes Anthropic message format               │
  ├──────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ P3       │ cost-tracker.ts + utils/modelCost.ts │ Per-model pricing                                               │
  └──────────┴──────────────────────────────────────┴─────────────────────────────────────────────────────────────────┘

  The architecture is well-modularized enough that the API layer is cleanly separable. The hardest part won't be the plumbing — it'll be adapting the tool-use
  protocol (Anthropic's tool_use/tool_result blocks vs OpenAI's function_calling format) and the streaming event format.

  Paste the next file or directory you'd like me to dive into.
