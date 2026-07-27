import fitz
import os
import re

pdf_path = r"C:\Users\b0109\sgsolar-analysis\docs\reference\company-profile-2026.pdf"
out = r"C:\Users\b0109\sgsolar-analysis\docs\reference\pdf-audit"
os.makedirs(os.path.join(out, "renders-all"), exist_ok=True)

doc = fitz.open(pdf_path)
print(f"pages={doc.page_count}")

# Dump searchable summary with unicode
summary_path = os.path.join(out, "summary.txt")
with open(summary_path, "w", encoding="utf-8") as sf:
    for i, page in enumerate(doc):
        text = page.get_text("text")
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        sf.write(f"\n===== PAGE {i+1} =====\n")
        sf.write("\n".join(lines[:40]))
        sf.write("\n")
        # render every page at moderate res for visual audit
        pix = page.get_pixmap(matrix=fitz.Matrix(1.25, 1.25), alpha=False)
        pix.save(os.path.join(out, "renders-all", f"page-{i+1:02d}.png"))

print("summary and renders written")

# Find process pages by searching text files for titles
targets = [
    "가정용 상계거래형 태양광 프로세스",
    "사업용 RPS 태양광 프로세스",
    "자가",
    "PPA",
    "사업영역",
    "연혁",
]
for i in range(doc.page_count):
    t = doc[i].get_text("text")
    for target in targets:
        if target in t:
            print(f"FOUND '{target}' on page {i+1}")
