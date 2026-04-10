---
name: retro
description: Engineering retrospective for a completed feature or sprint. Use when user says "retro", "retrospective", "what did we learn", "review this session", or at end of a project phase. Captures what worked, what didn't, lessons learned, and saves key insights to memory.
category: workflow
status: working
source: gstack (adapted)
metadata:
  version: "1.0"
---

## Retrospective

Capture learnings from completed work so future sessions benefit.

## Retro Framework (4Ls)
- **Liked** — What worked well? What should we keep doing?
- **Learned** — What did we discover? Any surprises?
- **Lacked** — What was missing? What slowed us down?
- **Longed for** — What would have made this much easier?

## How to run
At the end of a session or feature:
```
Run a retro on what we just built
```
or
```
Retro on the dashboard feature we shipped today
```

## What to capture
1. **Technical decisions** — What approach did we pick and why? Would we pick it again?
2. **Dead ends** — What approaches failed? Save these as skills/memories so we don't repeat them
3. **Time sinks** — What took longer than expected? How do we avoid next time?
4. **Quick wins** — What went faster than expected? Replicate this pattern

## Auto-save to memory
After retro, automatically save key learnings with:
```
/memsave [key insight from retro] #retro #[project-name]
```

## Output Format
```
## Retrospective — [feature/date]

### ✓ What worked
- [things to repeat]

### 📚 Learned
- [discoveries, surprises, non-obvious facts]

### 🐢 What slowed us
- [blockers, friction, dead ends]
- Dead end: [what failed] — avoid this because [reason]

### 💡 Next time
- [concrete process improvements]

### Saved to memory
- [list of /memsave commands run]
```

## Key Rules
- Be honest about what didn't work — that's the most valuable part
- Dead ends are worth saving: they prevent the next agent from wasting time on the same path
- Keep it short — 10 bullets max per section
- Always end with actionable "next time" items
