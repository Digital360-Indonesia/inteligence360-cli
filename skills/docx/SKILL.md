---
name: docx
description: Create, read, edit, and manipulate Word documents (.docx). Use when the user wants a Word doc, report, memo, letter, template, or any .docx file with formatting like headings, tables, images, page numbers, or tracked changes.
category: document
status: working
source: anthropics/skills (adapted)
metadata:
  version: "1.0"
---

## Word Document Operations

### Read content
```bash
pandoc --track-changes=all document.docx -o output.md
```

### Create new document (docx npm library)
```bash
npm install -g docx
```

```javascript
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const fs = require('fs');

const doc = new Document({
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 }, // US Letter (1440 DXA = 1 inch)
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Title")] }),
      new Paragraph({ children: [new TextRun("Body text here.")] }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => fs.writeFileSync("output.docx", buf));
```

## Critical Rules
- **Always set page size explicitly** — docx-js defaults to A4, not US Letter
- **Never use `\n`** — use separate Paragraph elements
- **Never use unicode bullets** (• ‣) — use `LevelFormat.BULLET` with numbering config
- **PageBreak must be inside a Paragraph** — standalone creates invalid XML
- **ImageRun requires `type`** — always specify `"png"`, `"jpg"`, etc.
- **Tables: always use `WidthType.DXA`** — never `WidthType.PERCENTAGE` (breaks in Google Docs)
- **Tables need dual widths**: `columnWidths` array AND `width` on each cell — both must match

## Tables
```javascript
const { Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } = require('docx');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
new Table({
  width: { size: 9360, type: WidthType.DXA }, // content width (page - margins)
  columnWidths: [4680, 4680], // must sum to table width
  rows: [ new TableRow({ children: [
    new TableCell({
      width: { size: 4680, type: WidthType.DXA },
      shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, // CLEAR not SOLID
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun("Cell")] })]
    })
  ]})]
})
```

## Lists
```javascript
// Correct way — never use unicode bullet characters
const doc = new Document({
  numbering: { config: [{
    reference: "bullets",
    levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
  }]},
  sections: [{ children: [
    new Paragraph({ numbering: { reference: "bullets", level: 0 },
      children: [new TextRun("Item one")] }),
  ]}]
});
```

## Page sizes (DXA, 1440 = 1 inch)
| Paper | Width | Height |
|-------|-------|--------|
| US Letter | 12240 | 15840 |
| A4 | 11906 | 16838 |
