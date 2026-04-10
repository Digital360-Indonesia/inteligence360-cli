---
name: plan-review
description: Review and challenge any implementation plan before coding starts. Use when the user says "review my plan", "check this plan", "is this approach good", or before starting a complex feature. Acts as a senior engineer + CEO review — challenges assumptions, spots missing edge cases, suggests simpler alternatives.
category: workflow
status: working
source: gstack (adapted)
metadata:
  version: "1.0"
---

## Plan Review

A two-stage review process: engineering review first, then strategic review.

## When to trigger
- User presents an implementation plan
- Before starting any task that will take >30 min
- When user asks "does this make sense?" about an approach
- After /ultraplan or any planning phase

## Engineering Review Checklist
Ask yourself:
1. **Scope** — Is this the simplest solution that solves the actual problem?
2. **Dependencies** — Are new dependencies justified? Could existing ones do the job?
3. **Edge cases** — What happens with empty input, nulls, large data, concurrent access?
4. **Reversibility** — Is this easy to roll back if it fails?
5. **Test surface** — How will this be tested? Is it testable?
6. **Performance** — Any obvious N+1 queries, blocking calls, or memory leaks?

## Strategic Review Checklist
1. **Goal alignment** — Does this solve the stated user need, not just the stated technical spec?
2. **Over-engineering** — Are we building for hypothetical future requirements?
3. **Risk** — What's the blast radius if this breaks in production?
4. **Time vs value** — Is the complexity worth the benefit?

## Output format
```
## Plan Review

### ✓ What's solid
- [list strengths]

### ⚠ Concerns
- [concern] → [suggested fix]

### 🔴 Blockers (must fix before proceeding)
- [critical issues if any]

### Verdict
APPROVED / APPROVED WITH CHANGES / NEEDS REWORK
```

## Key Rules
- Be direct — no diplomatic softening of serious issues
- Suggest concrete alternatives, not just criticism
- If the plan is good, say so clearly and move on fast
- Do NOT rewrite the plan from scratch — improve it
