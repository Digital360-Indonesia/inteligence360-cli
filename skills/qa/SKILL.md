---
name: qa
description: Quality assurance review and test planning for a feature or codebase. Use when user says "test this", "QA this feature", "write tests", "what could break", or after implementing a feature. Covers unit tests, integration tests, edge cases, and browser/UI testing approaches.
category: workflow
status: working
source: gstack (adapted)
metadata:
  version: "1.0"
---

## QA & Testing

Systematic quality review: find what could break before users do.

## QA Checklist
When reviewing a feature, go through:

### Functional
- [ ] Happy path works
- [ ] All documented edge cases handled
- [ ] Error states shown to user clearly
- [ ] Loading/pending states work
- [ ] Empty states handled

### Input Validation
- [ ] Empty inputs
- [ ] Max length / overflow inputs
- [ ] Special characters (`<>'";&`)
- [ ] Unicode / emoji / RTL text
- [ ] Negative numbers, zero, very large numbers
- [ ] Wrong types (string where number expected)

### State & Concurrency
- [ ] Double-submit (clicking button twice fast)
- [ ] Race conditions (two requests in flight)
- [ ] State after navigation away and back
- [ ] State after page refresh

### Integration
- [ ] Works with real API (not just mocked)
- [ ] Handles API errors gracefully (500, 429, network timeout)
- [ ] Auth token expiry handled

## Writing Tests
```typescript
// Unit test pattern (Bun test)
import { test, expect } from 'bun:test'

test('description of what it should do', () => {
  // Arrange
  const input = ...
  // Act
  const result = functionUnderTest(input)
  // Assert
  expect(result).toBe(expected)
})

// Edge case test
test('handles empty input', () => {
  expect(() => functionUnderTest('')).not.toThrow()
})
```

## Browser UI Testing (Playwright)
```typescript
import { test, expect } from '@playwright/test'

test('user can submit form', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await page.fill('#email', 'test@example.com')
  await page.click('button[type=submit]')
  await expect(page.locator('.success-message')).toBeVisible()
})
```

## Output Format
```
## QA Report

### Test Coverage Gaps
- [what isn't tested and should be]

### Risk Areas
- [code paths most likely to break]

### Recommended Tests
- [ ] Test 1: [description]
- [ ] Test 2: [description]

### Manual Test Script
1. [step-by-step user flow to test manually]
```

## Key Rules
- Test real behavior, not implementation details
- One assertion per test — clear failure messages
- Test edge cases first, they catch 80% of bugs
- Don't mock what you can test for real
