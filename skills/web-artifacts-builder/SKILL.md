---
name: web-artifacts-builder
description: Build complex interactive web apps (React + Tailwind + shadcn/ui) and bundle them into a single self-contained HTML file. Use when the user wants a working interactive UI, mini web app, dashboard, tool, or visualisation delivered as a standalone file they can open in any browser.
category: design
status: working
source: anthropics/skills (adapted)
metadata:
  version: "1.0"
---

## Web Artifacts Builder

Builds a full React app and bundles it into ONE self-contained HTML file — no server, no install, open in any browser.

### Stack
React 18 + TypeScript + Vite + Parcel (bundler) + Tailwind CSS 3.4 + shadcn/ui

### Step 1 — Scaffold
```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npx shadcn@latest init
npx shadcn@latest add button card input badge tabs
```

### Step 2 — Build your component
```tsx
// src/App.tsx
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function App() {
  const [count, setCount] = useState(0)
  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">My App</h1>
        <Button onClick={() => setCount(c => c + 1)}>Count: {count}</Button>
      </Card>
    </div>
  )
}
```

### Step 3 — Bundle to single HTML
```bash
npm install -D parcel @parcel/transformer-typescript-tsc
npx parcel build index.html --no-source-maps
# Then inline all assets into one file:
npx parcel build index.html --no-source-maps --inline-scripts --inline-styles
```

Or use a simpler inline approach:
```bash
npm run build  # vite build
# assets in dist/ — serve locally or inline manually
python3 -m http.server 3000 -d dist
```

## Design Rules (avoid generic look)
- No excessive centered layouts
- No purple gradients
- No uniform rounded corners on everything
- No Inter font as default — pick something with character
- Every visual decision should feel intentional for the specific content

## Key Notes
- All state stays in React (useState/useReducer) — no backend needed
- For data: fetch from public APIs or embed JSON directly in the component
- shadcn/ui components are unstyled by default — customize freely
- Single HTML output works offline, shareable by email/chat
