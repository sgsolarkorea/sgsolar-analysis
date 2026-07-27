import fitz
import json
import os

pdf_path = r"C:\Users\b0109\sgsolar-analysis\docs\reference\company-profile-2026.pdf"
out = r"C:\Users\b0109\sgsolar-analysis\docs\reference\pdf-audit"
os.makedirs(out, exist_ok=True)
os.makedirs(os.path.join(out, "images"), exist_ok=True)
os.makedirs(os.path.join(out, "renders"), exist_ok=True)

doc = fitz.open(pdf_path)
print(f"pages={doc.page_count}")
index = []

for i, page in enumerate(doc):
    text = page.get_text("text")
    title = ""
    for line in text.splitlines():
        s = line.strip()
        if s:
            title = s
            break
    index.append(
        {
            "page": i + 1,
            "title": title,
            "chars": len(text),
            "images": len(page.get_images(full=True)),
        }
    )
    with open(os.path.join(out, f"page-{i+1:02d}.txt"), "w", encoding="utf-8") as f:
        f.write(text)

print("=== KEYWORD HITS ===")
keywords = [
    "가정용",
    "상계",
    "RPS",
    "PPA",
    "프로세스",
    "토지",
    "지붕",
    "공장",
    "창고",
    "주차",
    "캐노피",
    "시공",
    "연혁",
    "사업영역",
    "SMP",
    "REC",
    "한전",
    "인허가",
    "상업운전",
    "사용전",
]
for i, page in enumerate(doc):
    t = page.get_text("text")
    hits = [k for k in keywords if k in t]
    if hits:
        print(f"p{i+1}: {', '.join(hits)} | {index[i]['title'][:80]}")

# Render key process pages for visual QA (1-based page numbers from titles)
render_pages = set()
for i, page in enumerate(doc):
    t = page.get_text("text")
    if "가정용 상계거래형 태양광 프로세스" in t or "사업용 RPS 태양광 프로세스" in t or "PPA" in t and "프로세스" in t:
        render_pages.add(i)
    if "사업영역" in t or "연혁" in t:
        render_pages.add(i)

# also render nearby pages around discovered process titles
for i, meta in enumerate(index):
    title = meta["title"]
    if "프로세스" in title or "상계거래" in title or "RPS" in title:
        render_pages.add(i)

for i in sorted(render_pages):
    page = doc[i]
    pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
    pix.save(os.path.join(out, "renders", f"page-{i+1:02d}.png"))
    print(f"rendered page {i+1}")

img_meta = []
seen = set()
for i, page in enumerate(doc):
    for img in page.get_images(full=True):
        xref = img[0]
        if xref in seen:
            continue
        seen.add(xref)
        try:
            pix = fitz.Pixmap(doc, xref)
            if pix.n - pix.alpha >= 4:
                pix = fitz.Pixmap(fitz.csRGB, pix)
            w, h = pix.width, pix.height
            if w < 280 or h < 180:
                continue
            name = f"p{i+1:02d}_xref{xref}_{w}x{h}.png"
            path = os.path.join(out, "images", name)
            pix.save(path)
            img_meta.append({"page": i + 1, "xref": xref, "w": w, "h": h, "file": name})
        except Exception as e:
            print("img fail", i + 1, xref, e)

with open(os.path.join(out, "index.json"), "w", encoding="utf-8") as f:
    json.dump({"pages": index, "images": img_meta}, f, ensure_ascii=False, indent=2)

print(f"images_extracted={len(img_meta)}")
print("done")
