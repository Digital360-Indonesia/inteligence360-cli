---
name: frontend-design
description: Build distinctive, production-grade web interfaces and UI components. Use when creating React apps, dashboards, landing pages, components, or any frontend UI that needs to look polished and intentional rather than generic.
category: design
status: working
source: anthropics/skills (adapted)
metadata:
  version: "1.0"
---

## Frontend Design

### Stack
React 18 + TypeScript + Tailwind CSS + shadcn/ui

### Quick start
```bash
npx create-next-app@latest my-app --typescript --tailwind
cd my-app
npx shadcn@latest init
npx shadcn@latest add button card input
```

## Design Process
1. **Understand context** — purpose, audience, tone, constraints
2. **Commit to a bold aesthetic direction** before writing any code
3. **Pick ONE distinctive element** and repeat it for cohesion
4. **Execute with precision** — complexity should match vision

## Design Principles
- Distinctive typography > common defaults (avoid Inter everywhere)
- Cohesive palette: one dominant color (60-70%) + sharp accent
- Motion: high-impact moments only, not scattered everywhere
- Asymmetry and negative space > uniform grids
- Atmospheric backgrounds and contextual visual details

## Avoid (generic AI aesthetics)
- Excessive centered layouts
- Purple gradients
- Uniform rounded corners on everything
- Cookie-cutter card layouts
- Predictable hero → features → CTA pattern without twist

## Color palette examples
```css
/* Dark Navy (Intelligence360 style) */
--bg: #0d1b2e; --panel: #132035; --accent: #4dabf7; --gold: #f5c842;

/* Warm Professional */
--bg: #faf9f5; --text: #141413; --accent: #d97757;

/* High Contrast Bold */
--bg: #0a0a0a; --text: #ffffff; --accent: #ff3b3b;
```

## Component pattern
```tsx
// Always typed, always a named export
export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      {children}
    </div>
  )
}
```

## Key Rules
- Minimalist designs demand precision and restraint — no accidental complexity
- Maximalist designs warrant elaborate code — commit fully
- Always check mobile responsiveness
- Intentionality > intensity — every element should have a reason
