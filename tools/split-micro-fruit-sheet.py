"""Split the clearly identifiable fruit cells from the supplied reference sheet."""
from collections import deque
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "app/assets/welcome-practice/micro-fruits"
SOURCE = BASE / "references/reference-2.jpg"
OUT = BASE / "icons"
OUT.mkdir(parents=True, exist_ok=True)

# Reference 2 is an evenly spaced 11 x 3 grid. Ambiguous/duplicate cells are
# deliberately excluded; these positions were visually checked against it.
FRUITS = {
    "dragon-fruit": (0, 0, "Dragon fruit"), "coconut": (1, 0, "Coconut"),
    "cherry": (2, 0, "Cherry"), "blueberry": (3, 0, "Blueberry"),
    "grape": (4, 0, "Grape"),
    "banana": (6, 0, "Banana"), "avocado": (7, 0, "Avocado"),
    "apricot": (8, 0, "Apricot"), "watermelon": (9, 0, "Watermelon"),
    "mandarin": (10, 0, "Mandarin"),
    "strawberry": (0, 1, "Strawberry"), "apple": (1, 1, "Apple"),
    "raspberry": (2, 1, "Raspberry"), "pomegranate": (3, 1, "Pomegranate"),
    "plum": (4, 1, "Plum"), "pineapple": (5, 1, "Pineapple"),
    "peach": (6, 1, "Peach"), "pear": (7, 1, "Pear"),
    "orange": (9, 1, "Orange"), "papaya": (10, 1, "Papaya"),
    "cantaloupe": (1, 2, "Cantaloupe"), "mango": (2, 2, "Mango"),
    "lychee": (3, 2, "Lychee"), "lime": (4, 2, "Lime"),
    "lemon": (5, 2, "Lemon"), "kiwi": (6, 2, "Kiwifruit"),
    "grapefruit": (9, 2, "Grapefruit"), "fig": (10, 2, "Fig"),
}
EXTRA_FRUITS = {"blackberry": (1, 2, "Blackberry", (136, 183, 190, 263))}

def transparent_background(image):
    """Remove only near-white pixels connected to the crop edge."""
    px = image.load()
    w, h = image.size
    seen = bytearray(w * h)
    q = deque()
    def add(x, y):
        i = y * w + x
        if seen[i]: return
        r, g, b = px[x, y][:3]
        if min(r, g, b) > 232 and max(r, g, b) - min(r, g, b) < 22:
            seen[i] = 1
            q.append((x, y))
    for x in range(w): add(x, 0); add(x, h - 1)
    for y in range(h): add(0, y); add(w - 1, y)
    while q:
        x, y = q.popleft()
        px[x, y] = (*px[x, y][:3], 0)
        for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0 <= nx < w and 0 <= ny < h: add(nx, ny)
    return image

manifest = {"sources": ["references/reference-2.jpg", "references/reference-9.jpg"], "icons": {}}
for source_name, fruits, columns, rows in (("reference-2.jpg", FRUITS, 11, 3), ("reference-9.jpg", EXTRA_FRUITS, 4, 3)):
  sheet = Image.open(BASE / "references" / source_name).convert("RGBA")
  cell_w, cell_h = sheet.width / columns, sheet.height / rows
  for fruit_id, cell in fruits.items():
    col, row, label = cell[:3]
    # Trim the inter-cell gutters while retaining the full illustration.
    inset = 2 if columns == 11 else 3
    left = round(col * cell_w + inset); right = round((col + 1) * cell_w - inset)
    top = round(row * cell_h + inset); bottom = round((row + 1) * cell_h - inset)
    if len(cell) == 4: left, top, right, bottom = cell[3]
    crop = transparent_background(sheet.crop((left, top, right, bottom)))
    alpha = crop.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise RuntimeError(f"No visible image in {fruit_id}")
    crop = crop.crop(bbox)
    crop.thumbnail((224, 224), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(crop, ((256 - crop.width)//2, (256 - crop.height)//2))
    name = f"{fruit_id}.png"
    canvas.save(OUT / name, optimize=True)
    manifest["icons"][fruit_id] = {"label": label, "file": f"icons/{name}", "source": f"references/{source_name}", "sourceCell": [col, row]}
(BASE / "icons-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(f"Split {len(manifest['icons'])} named fruits into {OUT}")
