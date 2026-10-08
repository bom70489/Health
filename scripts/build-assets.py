"""Generate original code-drawn application branding; no external patient imagery."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / 'assets'
root.mkdir(exist_ok=True)
def avatar(transparent=False):
    canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0) if transparent else '#EAF4FF')
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle((202, 272, 822, 796), radius=200, fill='#A4D2FC')
    d.rounded_rectangle((252, 320, 772, 746), radius=152, fill='white')
    d.rounded_rectangle((488, 180, 536, 288), radius=20, fill='#2878D0')
    d.ellipse((462, 136, 562, 236), fill='#2878D0')
    d.rounded_rectangle((372, 448, 414, 526), radius=20, fill='#17314D')
    d.rounded_rectangle((610, 448, 652, 526), radius=20, fill='#17314D')
    d.arc((443, 516, 581, 634), 10, 170, fill='#135BA8', width=16)
    d.ellipse((318, 548, 368, 578), fill='#D8ECFF')
    d.ellipse((656, 548, 706, 578), fill='#D8ECFF')
    return canvas
avatar().save(root / 'icon.png')
avatar().resize((64, 64), Image.Resampling.LANCZOS).save(root / 'favicon.png')
avatar(True).save(root / 'android-icon-foreground.png')
print('Original Gan icons generated')
