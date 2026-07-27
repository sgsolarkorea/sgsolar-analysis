"""Convert selected PDF-embedded photos into web assets (no page chrome)."""
from PIL import Image
import os

src = r"C:\Users\b0109\sgsolar-analysis\docs\reference\pdf-audit\images"
out_vis = r"C:\Users\b0109\sgsolar-analysis\public\install-visuals"
out_cases = r"C:\Users\b0109\sgsolar-analysis\public\company-profile\cases"
os.makedirs(out_vis, exist_ok=True)
os.makedirs(out_cases, exist_ok=True)

# Single clean photos (no collage chrome)
singles = [
    ("p18_xref713_1283x688.png", "ground", "ground-01"),
    ("p13_xref537_1280x720.png", "building-roof", "warehouse-01"),
    ("p08_xref477_1400x1050.png", "residential", "residential-01"),
]

for filename, visual_key, case_key in singles:
    im = Image.open(os.path.join(src, filename)).convert("RGB")
    im.save(os.path.join(out_vis, f"{visual_key}.webp"), "WEBP", quality=84)
    im.save(os.path.join(out_vis, f"{visual_key}.jpg"), "JPEG", quality=88)
    im.save(os.path.join(out_cases, f"{case_key}.webp"), "WEBP", quality=84)
    print("saved", visual_key, case_key, im.size)

# Split collage grids into tiles (3x4 assumed for p48/p51 style)
def split_grid(filename, prefix, rows, cols, picks):
    path = os.path.join(src, filename)
    im = Image.open(path).convert("RGB")
    w, h = im.size
    # trim thin black borders
    tw, th = w // cols, h // rows
    for idx, (r, c, name) in enumerate(picks):
        box = (c * tw + 2, r * th + 2, (c + 1) * tw - 2, (r + 1) * th - 2)
        tile = im.crop(box)
        out = os.path.join(out_cases, f"{name}.webp")
        tile.save(out, "WEBP", quality=84)
        print("tile", name, tile.size)

# p48: 3 rows x 4 cols — ground, factory, residential, carport candidates
split_grid(
    "p48_xref1972_1122x794.png",
    "p48",
    3,
    4,
    [
        (0, 0, "ground-02"),
        (0, 1, "ground-03"),
        (0, 2, "carport-01"),
        (1, 1, "factory-01"),
        (1, 3, "residential-02"),
        (2, 1, "factory-02"),
    ],
)

# carport visual from collage
carport = Image.open(os.path.join(out_cases, "carport-01.webp")).convert("RGB")
carport.save(os.path.join(out_vis, "carport.webp"), "WEBP", quality=84)
carport.save(os.path.join(out_vis, "carport.jpg"), "JPEG", quality=88)

factory = Image.open(os.path.join(out_cases, "factory-01.webp")).convert("RGB")
factory.save(os.path.join(out_vis, "factory.webp"), "WEBP", quality=84)
factory.save(os.path.join(out_vis, "warehouse.webp"), "WEBP", quality=84)

print("done")
