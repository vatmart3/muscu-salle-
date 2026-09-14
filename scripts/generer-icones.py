#!/usr/bin/env python3
"""
Génère les icônes de l'application à partir de la marque : un disque de fonte.
Anneau bleu sur fond d'encre, trou central. Aucune dépendance à un fichier source.

Usage : python3 scripts/generer-icones.py
"""
from PIL import Image, ImageDraw
import os

ENCRE = (10, 22, 40, 255)
BLEU = (0, 113, 227, 255)
BLANC = (255, 255, 255, 255)
SORTIE = os.path.join(os.path.dirname(__file__), "..", "public", "icones")


def disque(taille: int, marge_ratio: float, fond) -> Image.Image:
    """Trace un disque de fonte centré : anneau bleu épais, trou d'encre au centre."""
    s = taille * 4  # supersampling
    img = Image.new("RGBA", (s, s), fond)
    d = ImageDraw.Draw(img)
    marge = int(s * marge_ratio)
    boite = (marge, marge, s - marge, s - marge)
    rayon = (s - 2 * marge) / 2
    # corps du disque
    d.ellipse(boite, fill=BLEU)
    # trou central
    trou = int(rayon * 0.34)
    c = s / 2
    d.ellipse((c - trou, c - trou, c + trou, c + trou), fill=fond)
    # liseré interne, pour la lecture à petite taille
    liser = int(rayon * 0.62)
    d.ellipse((c - liser, c - liser, c + liser, c + liser), outline=fond, width=max(2, int(s * 0.012)))
    return img.resize((taille, taille), Image.LANCZOS)


def main() -> None:
    os.makedirs(SORTIE, exist_ok=True)
    for taille in (192, 512):
        disque(taille, 0.12, ENCRE).save(os.path.join(SORTIE, f"icone-{taille}.png"))
    # maskable : zone de sécurité de 20 % tout autour
    disque(512, 0.26, ENCRE).save(os.path.join(SORTIE, "icone-maskable-512.png"))
    # favicon clair, lisible dans un onglet
    disque(64, 0.06, BLANC).save(os.path.join(SORTIE, "favicon-64.png"))
    disque(180, 0.12, ENCRE).save(os.path.join(SORTIE, "apple-touch-icon.png"))
    print("icônes générées dans public/icones/")


if __name__ == "__main__":
    main()
