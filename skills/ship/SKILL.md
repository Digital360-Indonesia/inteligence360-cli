---
name: ship
description: Pre-ship checklist and release preparation. Use when user says "ready to ship", "deploy this", "release checklist", "review before merge", or at the end of a feature. Runs through a systematic check of code quality, tests, docs, and deployment readiness.
category: workflow
status: working
source: gstack (adapted)
metadata:
  version: "1.0"
---

## Ship Checklist

Systematic pre-release review to catch issues before they hit production.

## The Checklist

### Code Quality
- [ ] No console.log / debug statements left in
- [ ] No hardcoded secrets, URLs, or test credentials
- [ ] No commented-out code blocks
- [ ] Error handling for all external calls
- [ ] No obvious performance issues (N+1, blocking in loop)

### Tests
- [ ] Tests pass (`bun test` / `npm test`)
- [ ] New code has test coverage
- [ ] No tests skipped with `.skip` or `xit`

### Documentation
- [ ] README updated if new setup required
- [ ] New environment variables documented
- [ ] Breaking changes noted

### Git
- [ ] Clean commit history (no "wip", "fix typo x5")
- [ ] Branch is up to date with main
- [ ] No merge conflicts

### Security (quick scan)
- [ ] No sensitive data in logs
- [ ] Auth checks on new routes/endpoints
- [ ] User input validated before use

### Deployment
- [ ] Environment variables set in prod
- [ ] DB migrations ready (if any)
- [ ] Rollback plan exists

## How to use
```
Run the ship checklist on the current changes in src/payments/
```
or
```
We're about to deploy the dashboard feature — run ship checklist
```

## Output Format
```
## Ship Checklist

### ✓ Passed
- [items that are good]

### ⚠ Needs attention
- [item] — [what to fix]

### 🔴 Blockers
- [critical issues]

### Verdict: READY TO SHIP / FIX THESE FIRST
```

## Key Rules
- Run `git diff main...HEAD` to see all changes before reviewing
- Check both the code AND the tests
- If there are blockers, stop and fix — don't ship with known issues
- After ship: tag the release in git
