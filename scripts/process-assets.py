"""Turn generated 4-frame chroma strips into transparent, runtime-sized PNG frames."""
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "nuoge"


def largest_alpha_component(image: Image.Image) -> Image.Image:
    """Remove detached generation artifacts while preserving the connected character."""
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    mask = alpha.point(lambda value: 255 if value >= 20 else 0)
    width, height = mask.size
    pixels = mask.load()
    seen = set()
    components = []
    for y in range(height):
        for x in range(width):
            if not pixels[x, y] or (x, y) in seen:
                continue
            stack = [(x, y)]
            seen.add((x, y))
            component = []
            while stack:
                px, py = stack.pop()
                component.append((px, py))
                for nx, ny in ((px-1, py), (px+1, py), (px, py-1), (px, py+1)):
                    if 0 <= nx < width and 0 <= ny < height and pixels[nx, ny] and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            components.append(component)
    if not components:
        return rgba
    keep = set(max(components, key=len))
    data = rgba.load()
    for y in range(height):
        for x in range(width):
            if (x, y) not in keep:
                data[x, y] = (0, 0, 0, 0)
    return rgba


def split_strip(source: Path, state: str) -> None:
    image = Image.open(source).convert("RGBA")
    frame_width = image.width // 4
    destination = OUT / state
    destination.mkdir(parents=True, exist_ok=True)
    for index in range(4):
        frame = image.crop((index * frame_width, 0, (index + 1) * frame_width, image.height))
        frame = largest_alpha_component(frame)
        frame.thumbnail((220, 260), Image.Resampling.NEAREST)
        canvas = Image.new("RGBA", (240, 280), (0, 0, 0, 0))
        canvas.alpha_composite(frame, ((240 - frame.width) // 2, 280 - frame.height))
        canvas.save(destination / f"frame-{index + 1:02d}.png", optimize=True)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: process-assets.py <transparent-strip> <state>")
    split_strip(Path(sys.argv[1]), sys.argv[2])
