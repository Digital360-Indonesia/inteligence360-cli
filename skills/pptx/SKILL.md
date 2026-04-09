---
name: pptx
description: Create, read, and edit PowerPoint (.pptx) presentations. Use when the user wants to build a slide deck, presentation, or modify existing PowerPoint files.
category: document
status: working
source: anthropics/skills (adapted)
metadata:
  version: "1.0"
---

## PowerPoint Operations

### Read / extract text
```bash
python -m markitdown presentation.pptx
```

### Create presentation
```python
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

prs = Presentation()
slide_layout = prs.slide_layouts[1]  # Title and Content
slide = prs.slides.add_slide(slide_layout)

title = slide.shapes.title
title.text = "My Title"
title.text_frame.paragraphs[0].font.size = Pt(40)
title.text_frame.paragraphs[0].font.bold = True

content = slide.placeholders[1]
content.text = "First bullet point"

prs.save("output.pptx")
```

### Add image to slide
```python
slide.shapes.add_picture("image.png", Inches(1), Inches(2), Inches(4), Inches(3))
```

## Design Principles
- Pick **one bold, content-informed color palette** — dominant color (60-70% weight) + 1-2 supporting tones
- Commit to **one distinctive visual element** repeated across slides for cohesion
- Title: 36-44pt bold · Body: 14-16pt · Min margins: 0.5"
- Leave breathing room — 0.3-0.5" between content blocks

## Color Palettes (ready to use)
| Name | Primary | Accent |
|------|---------|--------|
| Midnight Executive | `#0d1b2e` | `#4dabf7` |
| Cherry Bold | `#8b0000` | `#1a1a2e` |
| Forest Professional | `#1a3a2a` | `#f5c842` |
| Clean Modern | `#ffffff` | `#2563eb` |

## Key Rules
- Never create text-only slides — always have at least one visual element
- Avoid accent lines under titles — hallmark of generic AI slides
- Verify: no overlapping elements, no text overflow, good contrast before delivering
- Use `python-pptx` library: `pip install python-pptx`
