---
name: brand-guidelines
description: Apply consistent brand identity (colors, typography, style) to any design output. Use when the user wants UI, documents, or visuals to follow a specific brand look, or when building branded templates, assets, or presentations.
category: design
status: working
source: anthropics/skills (adapted — generalized for any brand)
metadata:
  version: "1.0"
---

## Brand Guidelines System

Apply a brand's visual identity consistently across any output — web UI, documents, presentations, graphics.

## Intelligence360 Brand (default)
```
Primary:     #0d1b2e  (dark navy)
Panel:       #132035
Border:      #2a5298
Accent:      #4dabf7  (bright blue)
Gold:        #f5c842
Text:        #e8f4ff
Dim:         #7ba7cc
Success:     #34e8a0
Error:       #ff6b7a

Headings:    SF Mono / Fira Code / monospace
Body:        Same (monospace theme)
```

## How to define a custom brand
Create a brand block at the top of your task:

```
BRAND:
  primary: #1a1a2e
  accent: #e94560
  background: #16213e
  text: #ffffff
  font-heading: Poppins
  font-body: Inter
  tone: bold, modern, tech
```

## Applying brand to web UI (Tailwind)
```css
/* tailwind.config.js */
theme: {
  extend: {
    colors: {
      primary: '#0d1b2e',
      accent: '#4dabf7',
      gold: '#f5c842',
    },
    fontFamily: {
      mono: ['Fira Code', 'monospace'],
    }
  }
}
```

## Applying brand to documents (PPTX/DOCX)
- Title slides: primary color background, gold/accent text
- Body slides: white/light background, primary color headings
- Accent elements: repeat one distinctive shape/line in brand color
- Typography: heading font for titles (24pt+), body font for content (12-14pt)

## Key Rules
- Dominant color = 60-70% of visual weight
- Max 2-3 colors in active use per design
- Font pairing: one display/heading + one readable body
- Consistent spacing units (8px grid system works well)
- Never mix more than 2 font families in one document

## Registered Brands

### Vidogarment
Garment brand. Classic, premium, professional tone.
```
Primary:     #6b0f1a  (deep red maroon)
Secondary:   #8b1a2a  (medium maroon)
Accent:      #c0392b  (bright red)
Background:  #1a0a0b  (near black warm)
Light bg:    #fdf6f6  (warm white)
Text dark:   #1a0a0b
Text light:  #fdf6f6

Font heading: Playfair Display / Georgia (serif, elegant)
Font body:    Lato / Arial (clean, readable)
Tone: premium, trustworthy, classic fashion
Logo hint: clean wordmark, no clutter
```

### Kustomgarment
Creative youth garment brand. Bold, energetic, expressive.
```
Primary:     #e85d04  (vivid orange)
Secondary:   #f48c06  (warm amber)
Accent:      #dc2f02  (hot red-orange)
Background:  #0a0a0a  (pure dark)
Light bg:    #fff8f0  (warm cream)
Text dark:   #1a1a1a
Text light:  #ffffff

Font heading: Bebas Neue / Impact (bold, street)
Font body:    Inter / Nunito (modern, friendly)
Tone: youthful, creative, streetwear, expressive
Logo hint: graphic, textured, bold
```

## How to apply a brand
When working on anything for these brands, just say the brand name:
- "make a banner for Vidogarment" → agent uses maroon palette + serif fonts
- "design a product page for Kustomgarment" → agent uses orange palette + bold fonts

## Common brand palettes
| Style | Primary | Accent | Mood |
|-------|---------|--------|------|
| Corporate Navy | `#003087` | `#0070C0` | Trust, professional |
| Startup Bold | `#0a0a0a` | `#ff3b3b` | Edgy, modern |
| Warm Creative | `#faf9f5` | `#d97757` | Approachable, organic |
| Tech Dark | `#0d1b2e` | `#4dabf7` | Intelligent, precise |
