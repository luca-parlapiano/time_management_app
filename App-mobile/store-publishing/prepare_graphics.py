"""Esporta la grafica della scheda store dagli asset sorgente di MindMorrow."""

from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent
ICON_SOURCE = ROOT.parent / "assets" / "images" / "icon.png"
FEATURE_SOURCE = ROOT / "source" / "feature-graphic-master.png"


def main() -> None:
    with Image.open(ICON_SOURCE) as source:
        icon = ImageOps.fit(source.convert("RGB"), (1024, 1024), method=Image.Resampling.LANCZOS)
        icon.save(ROOT / "app-store" / "icon-1024.png", optimize=True)
        icon.resize((512, 512), Image.Resampling.LANCZOS).convert("RGBA").save(
            ROOT / "google-play" / "graphics" / "icon-512.png", optimize=True
        )

    with Image.open(FEATURE_SOURCE) as source:
        feature = ImageOps.fit(source.convert("RGB"), (1024, 500), method=Image.Resampling.LANCZOS)
        feature.save(ROOT / "google-play" / "graphics" / "feature-graphic-1024x500.png", optimize=True)


if __name__ == "__main__":
    main()
