```
        /\_____/\
       /  ◈   ◈  \        I N T E L L I G E N C E
      ( ==  ◡  == )  ─────────────── 3 6 0 ───────────────
       )  ~~~~~  (       Multi-Model AI Command Center
      (  )     (  )
     (__(__)___(__)__)    Claude · GPT · Gemini · Grok
                          GLM · DeepSeek · Qwen · Llama
```

# Intelligence360 — Capabilities Guide

Intelligence360 is a multi-model AI command center for your terminal. It started as a fork of Claude Code but has evolved into its own platform — supporting 8 AI providers, a persistent skills library, cross-session memory, a live web dashboard, and a full sprint workflow system.

---

## What makes it different

Most AI CLI tools are a thin wrapper around one model. Intelligence360 is built around three ideas:

1. **Any model, same interface** — switch between Claude, GPT, Gemini, Grok, DeepSeek, Qwen, Llama, or GLM mid-session with one command
2. **Skills that persist** — working techniques are saved once and available in every future session, automatically, without re-explaining
3. **Memory that grows** — the system remembers what you've built, what failed, and what your preferences are across every session

---

## AI Providers

| Provider | Models |
|----------|--------|
| **Claude** (Anthropic) | claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5 |
| **OpenAI** | gpt-4o, gpt-4o-mini, o1, o3-mini |
| **Google Gemini** | gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash |
| **xAI Grok** | grok-3, grok-3-mini, grok-2 |
| **DeepSeek** | deepseek-chat, deepseek-reasoner |
| **Alibaba Qwen** | qwen-max, qwen-plus, qwen-turbo |
| **Groq (Llama)** | llama-3.3-70b, llama-3.1-8b, mixtral-8x7b |
| **Zhipu GLM** | glm-4-plus, glm-4-air, glm-4-flash |

Switch with `/model` at any time. API keys are saved once in `~/.intelligence360.env`.

---

## Slash Commands

### Core
| Command | What it does |
|---------|-------------|
| `/model` | Switch AI provider or model interactively |
| `/autosuper` | Toggle auto-permissions on/off (skip all tool confirmations) |
| `/clear` | Clear conversation history |
| `/compact` | Compress conversation to save context window |
| `/cost` | Show token usage and estimated cost |
| `/resume` | Continue a previous session |
| `/help` | Show all available commands |

### Skills Library
| Command | What it does |
|---------|-------------|
| `/saveskill <name> [description]` | Save the current working technique as a reusable skill |
| `/refreshskills` | Rebuild the global skills index from all skill files |

### Memory System
| Command | What it does |
|---------|-------------|
| `/memsave <text> [#tag1 #tag2]` | Save a memory that persists across all future sessions |
| `/memsave delete <id>` | Delete a specific memory entry |
| `/memsave clear` | Clear all saved memories |
| `/recall [query]` | Search memories by keyword |
| `/recall stats` | Show total memory count and date range |

---

## Skills Library

Skills are reusable techniques stored in `~/.intelligence360/skills/`. They are loaded automatically into every session via `~/.claude/CLAUDE.md` — the AI reads them at startup and uses the right one without being asked.

15 skills ship out of the box.

### Document Skills
These trigger automatically when you mention the relevant file type.

| Skill | Triggers when you... |
|-------|---------------------|
| **pdf** | Mention PDF, need to extract text/tables, generate a report as PDF |
| **xlsx** | Need to read, create, or edit Excel spreadsheets |
| **pptx** | Want to build or modify a PowerPoint presentation |
| **docx** | Need a Word document, report, memo, or letter |

### Design & Frontend Skills
| Skill | Triggers when you... |
|-------|---------------------|
| **frontend-design** | Build a React app, dashboard, landing page, or any web UI |
| **web-artifacts-builder** | Want a working interactive UI delivered as a single HTML file |
| **brand-guidelines** | Want consistent brand identity applied to any design output |

The brand-guidelines skill includes two pre-registered brands:
- **Vidogarment** — deep red maroon `#6b0f1a`, Playfair Display, premium/classic garment
- **Kustomgarment** — vivid orange `#e85d04`, Bebas Neue, youth/streetwear

### Workflow & Sprint Skills
These activate when you reach a natural phase in development work.

| Skill | Triggers when you... |
|-------|---------------------|
| **plan-review** | Say "review my plan", "is this approach good", or before starting complex work |
| **security-review** | Say "check security", "audit this", or when touching auth/payment/data code |
| **qa** | Say "test this", "write tests", "what could break", or after implementing a feature |
| **ship** | Say "ready to ship", "release checklist", or before deploying |
| **retro** | Say "retro", "what did we learn", or at the end of a project phase |

### Infrastructure & Meta Skills
| Skill | Triggers when you... |
|-------|---------------------|
| **mcp-builder** | Want to build an MCP server to connect the AI to an external tool or API |
| **instagram-image-download** | Want to download images from an Instagram post URL |
| **skill-creator** | Want to save a working technique as a new skill |

### Adding Your Own Skills

```bash
# Inside Intelligence360:
/saveskill my-technique A brief description of what this does

# Then fill in the generated file:
~/.intelligence360/skills/my-technique/SKILL.md

# Rebuild the index so all future sessions can use it:
/refreshskills
```

Or just describe the technique in chat and say "save this as a skill" — the skill-creator skill will guide the process.

---

## Persistent Memory

The memory system keeps context across sessions. Unlike skills (which store *how to do things*), memories store *what you've done, decided, or prefer*.

```bash
# Save anything worth remembering:
/memsave The client wants all dashboards in dark navy #preference #client
/memsave Instagram download via /media/?size=l endpoint — no auth needed #technique
/memsave We decided to use Bun over Node for this project #architecture

# Search later:
/recall client preference
/recall instagram

# Browse recent:
/recall
```

At the start of each session, the 30 most recent memories are automatically injected into the AI's context — so it always knows your preferences, past decisions, and project context without you re-explaining.

---

## Live Dashboard

Start the web dashboard:

```bash
intelligence360 --ui
```

Opens at `http://localhost:3621`

### Dashboard pages:

**Overview** — Live chat view of the current CLI session. Bidirectional: send messages from the browser and see real-time responses. Shows thinking indicator while the AI is working. Markdown + code block rendering. Tool call cards (collapsible).

**AI & Models** — Visual model picker grouped by provider. Green dot = API key configured. Click any model to switch the active model for the session.

**Usage** — All past sessions listed with summaries and timestamps. Click any session to view it in Overview.

**Appearance** — Live color and font customization. Changes apply instantly and are saved to localStorage. Reset to defaults any time.

**Settings** — Toggle auto-permissions, adjust poll rate, view all slash commands reference.

---

## Auto-Permissions

By default, Intelligence360 runs with auto-permissions enabled — all tool confirmations (file writes, bash commands, etc.) are bypassed automatically. This is intentional for power users who don't want interruptions.

Toggle mid-session:
```bash
/autosuper    # switches between ⚡ ON and 🔒 OFF
```

Or disable permanently:
```bash
INTELLIGENCE360_AUTO_PERMISSIONS=0 intelligence360
```

---

## Skills File Format

Skills follow a standard format compatible with Anthropic's skills spec:

```markdown
---
name: skill-name
description: What it does AND when to use it. Max 200 chars.
category: document | design | workflow | ai-infrastructure | general
status: working
tested-on: YYYY-MM-DD
metadata:
  version: "1.0"
---

## Skill Name

What this solves and why.

## Working Method
[steps or code]

## Key Rules
- Do X
- Do NOT do Y

## Edge Cases
- Case A: handle like this
```

Skills live in:
- `~/.intelligence360/skills/` — your personal skills (take precedence)
- `<install-dir>/skills/` — bundled skills (shipped with Intelligence360)

---

## Architecture

Built on Bun + React + Ink. Runs entirely locally — no cloud, no telemetry beyond what the AI provider itself collects.

```
~/.intelligence360/
  skills/           ← your saved skills
  memory.db         ← persistent SQLite memory

~/.claude/
  CLAUDE.md         ← auto-loaded context (skills index + memory)
  settings.json     ← hooks config
  projects/         ← session history (.jsonl files)
```

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/Digital360-Indonesia/inteligence360-cli/main/install.sh | bash
```

Requires macOS or Linux. Bun is installed automatically if not present.

---

Built by [Digital360 Indonesia](https://github.com/Digital360-Indonesia)
