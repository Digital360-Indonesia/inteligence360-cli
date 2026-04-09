---
name: xlsx
description: Create, read, edit, and format Excel (.xlsx) files. Use when the user needs to open, create, or edit spreadsheets, clean tabular data, build financial models, or produce reports as Excel files.
category: document
status: working
source: anthropics/skills (adapted)
metadata:
  version: "1.0"
---

## Excel Operations

### Libraries by task
| Task | Library |
|------|---------|
| Data analysis / manipulation | `pandas` |
| Formulas + formatting + charts | `openpyxl` |
| Read only (fast) | `openpyxl` read_only mode |

### Read Excel
```python
import pandas as pd
df = pd.read_excel("file.xlsx", sheet_name="Sheet1")
print(df.head())
```

### Create with formatting
```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

wb = Workbook()
ws = wb.active
ws.title = "Report"

# Header row
ws["A1"] = "Name"
ws["A1"].font = Font(bold=True)
ws["A1"].fill = PatternFill("solid", fgColor="1e3a8a")

wb.save("output.xlsx")
```

### Write DataFrame to Excel
```python
import pandas as pd

df = pd.DataFrame({"Name": ["Alice", "Bob"], "Score": [95, 87]})
with pd.ExcelWriter("output.xlsx", engine="openpyxl") as writer:
    df.to_excel(writer, index=False, sheet_name="Results")
```

## Financial Model Color Coding
- Blue `#0070C0` — input cells (hardcoded values)
- Black — formula cells
- Green `#00B050` — internal links
- Red `#FF0000` — external links
- Yellow `#FFFF00` background — key assumptions

## Key Rules
- Always use Excel formulas instead of calculating in Python and hardcoding results
- Use cell references, not hardcoded values inside formulas
- After creating with formulas, verify zero formula errors before delivering
- `WidthType.PERCENTAGE` breaks in Google Sheets — use fixed column widths
