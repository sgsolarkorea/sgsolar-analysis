"""
Crop installation-type photos from company profile page renders.
Avoid full-page screenshots; crop photo regions only.
"""
from PIL import Image
import os

src = r"C:\Users\b0109\sgsolar-analysis\docs\reference\pdf-audit\renders-all"
dst = r"C:\Users\b0109\sgsolar-analysis\public\install-visuals"
os.makedirs(dst, exist_ok=True)

# Page sizes from renders (1.25x matrix). Coordinates are fractions of width/height.
# Verified visually against rendered pages.

crops = [
    # page 08 (internal 07): residential - bottom real roof photo
    {
        "page": 8,
        "name": "residential",
        "box": (0.48, 0.52, 0.96, 0.88),
        "label": "주택 지붕형",
    },
    # page 10 (internal 09): four bottom photos — pick residential roof and carport
    {
        "page": 10,
        "name": "carport",
        "box": (0.04, 0.72, 0.26, 0.92),
        "label": "주차장형",
    },
    {
        "page": 10,
        "name": "residential-alt",
        "box": (0.27, 0.72, 0.49, 0.92),
        "label": "주택 지붕형",
    },
    # page 07 (internal 06): business areas — ground aerial left
    {
        "page": 7,
        "name": "ground",
        "box": (0.04, 0.18, 0.48, 0.48),
        "label": "토지형",
    },
    {
        "page": 7,
        "name": "building-roof",
        "box": (0.04, 0.50, 0.48, 0.72),
        "label": "건축물 지붕형",
    },
]

# Also try case photo pages 52 area - page 52 in TOC for construction photos
# pages 34+ are tables; photo gallery likely later. Scan pages 48-52.

extra_pages = [48, 49, 50, 51, 52]
for p in extra_pages:
    path = os.path.join(src, f"page-{p:02d}.png")
    if os.path.exists(path):
        print(f"extra page exists: {p}")

for item in crops:
    path = os.path.join(src, f"page-{item['page']:02d}.png")
    im = Image.open(path)
    w, h = im.size
    l, t, r, b = item["box"]
    box = (int(l * w), int(t * h), int(r * w), int(b * h))
    crop = im.crop(box)
    # save as webp and jpg
    out_webp = os.path.join(dst, f"{item['name']}.webp")
    out_jpg = os.path.join(dst, f"{item['name']}.jpg")
    crop.convert("RGB").save(out_webp, "WEBP", quality=82)
    crop.convert("RGB").save(out_jpg, "JPEG", quality=85)
    print(f"saved {item['name']} {crop.size} from page {item['page']}")

print("done")
