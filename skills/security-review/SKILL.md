---
name: security-review
description: Semantic security audit of code or a diff. Use when user says "check security", "security review", "is this safe", "audit this", or when reviewing auth/payment/data handling code. Goes beyond pattern-matching — understands intent and context to find real vulnerabilities, not just surface patterns.
category: workflow
status: working
source: anthropics/claude-code-security-review (adapted)
metadata:
  version: "1.0"
---

## Security Review

Semantic security analysis that understands code intent, not just surface patterns.

## Coverage Areas (OWASP Top 10 + more)
- **Injection**: SQL, command, NoSQL, LDAP, XPath injection
- **Auth**: Broken authentication, insecure session management, JWT issues
- **Exposure**: Sensitive data in logs, responses, error messages, git history
- **Access Control**: Missing auth checks, IDOR, privilege escalation paths
- **Cryptography**: Weak algorithms, hardcoded secrets, improper key management
- **XSS**: Reflected, stored, DOM-based
- **Config**: Default credentials, debug mode in prod, CORS misconfiguration
- **Supply chain**: Suspicious dependencies, typosquatting, outdated packages
- **Business logic**: Race conditions, price manipulation, workflow bypass
- **RCE**: eval(), unsafe deserialization, template injection

## How to run
For a specific file:
```
Review src/auth/login.ts for security vulnerabilities
```

For recent changes:
```
git diff HEAD~1 | Review this diff for security issues
```

For a feature:
```
Security review the payment flow in src/payments/
```

## Output format
```
## Security Review

### 🔴 Critical (fix before shipping)
| Issue | File:Line | Impact | Fix |
|-------|-----------|--------|-----|

### 🟡 Medium (fix soon)
| Issue | File:Line | Impact | Fix |

### 🟢 Low / Info
- [minor findings]

### ✓ Looks good
- [what was checked and found clean]

### Verdict: CRITICAL ISSUES / NEEDS FIXES / CLEAN
```

## Key Rules
- Explain WHY each finding is exploitable in THIS context — not just pattern-matched
- Provide the exact fix, not just "sanitize input"
- Distinguish between theoretical and practically exploitable issues
- If code is safe, say so — don't invent issues to seem thorough
- Check for secrets/keys in the code being reviewed
