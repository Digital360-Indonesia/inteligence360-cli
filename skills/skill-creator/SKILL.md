---
name: skill-creator
description: Create new skills for the Intelligence360 Skills Library. Use when the user wants to save a working technique, build a reusable workflow, or package knowledge so future agents can use it immediately without research.
category: meta
status: working
metadata:
  version: "1.0"
---

## Skill Creator

Guides the process of capturing and packaging any working technique into a reusable skill.

## When to create a skill
- An agent spent significant time figuring something out
- A technique will be needed again in future projects
- A workflow has clear inputs, steps, and outputs
- There are non-obvious pitfalls worth documenting

## Process

### 1. Capture what worked
Ask:
- What was the goal?
- What approaches FAILED (and why)?
- What was the working solution (exact code/commands)?
- What are the edge cases?
- What should future agents NOT do?

### 2. Create the skill file
```bash
/saveskill <name> <one-line description>
```

### 3. Fill in the SKILL.md template
```markdown
---
name: skill-name
description: What it does AND when to use it (triggers). Max 200 chars.
category: one-of: document | social-media | ai-infrastructure | design | data | automation | general
status: working
tested-on: YYYY-MM-DD
---

## [Skill Name]

One paragraph: what this solves and why the obvious approaches fail.

## Working Method
[step by step or code block]

## Key Rules
- Do X
- Do NOT do Y (explain why)

## Edge Cases
- Case A: handle like this
- Case B: handle like this
```

### 4. Run /refreshskills
Updates `~/.claude/CLAUDE.md` so the skill is live in all future sessions.

## Writing good descriptions
The description is what triggers the skill — write it so an agent reading it knows EXACTLY when to use it.

**Bad**: "Download images from websites"
**Good**: "Download full-resolution Instagram post images without authentication. Use when user wants to save/download an Instagram post image given a URL."

## Skill quality checklist
- [ ] Description mentions specific triggers (not vague)
- [ ] Working code is copy-pasteable and complete
- [ ] Dead-end approaches are documented (saves future research time)
- [ ] Edge cases are covered
- [ ] Under 200 lines — move reference details to separate files if needed
