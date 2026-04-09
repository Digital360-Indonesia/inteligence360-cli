---
name: pdf
description: Create, read, edit, merge, split, and extract content from PDF files. Use when the user mentions PDF, needs to generate a report as PDF, extract tables/text from a PDF, fill PDF forms, add watermarks, or convert documents to PDF.
category: document
status: working
source: anthropics/skills (adapted)
metadata:
  version: "1.0"
---

## PDF Operations

### Libraries by task
| Task | Library |
|------|---------|
| Merge / split / rotate | `pypdf` |
| Extract text + tables | `pdfplumber` |
| Create PDF from scratch | `reportlab` |
| OCR scanned PDFs | `pytesseract` |
| CLI operations | `pdftotext`, `qpdf`, `pdftk` |

### Read / extract text
```python
import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    for page in pdf.pages:
        print(page.extract_text())
        tables = page.extract_tables()  # returns list of lists
```

### Merge PDFs
```python
from pypdf import PdfWriter

writer = PdfWriter()
for path in ["a.pdf", "b.pdf", "c.pdf"]:
    writer.append(path)
with open("merged.pdf", "wb") as f:
    writer.write(f)
```

### Create PDF from scratch
```python
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

doc = SimpleDocTemplate("output.pdf", pagesize=letter)
styles = getSampleStyleSheet()
story = [Paragraph("Hello World", styles["Heading1"])]
doc.build(story)
```

## Key Rules
- Never use Unicode subscript/superscript chars in ReportLab — use `<sub>` and `<super>` XML tags inside Paragraph objects
- For complex layouts use Platypus (flowables), for simple drawings use Canvas
- `pdfplumber` preserves layout better than `pypdf` for extraction

## CLI Quick Reference
```bash
pdftotext -layout file.pdf output.txt   # extract with layout
qpdf --split-pages file.pdf out%.pdf    # split to individual pages
qpdf --empty --pages a.pdf b.pdf -- out.pdf  # merge
```
