# json_sidecar.py
# Helpers for creating and moving per-image JSON sidecars (authoritative metadata)
# Safe to import from any script in your pipeline.

from __future__ import annotations
import hashlib
import json
import time
import shutil
from pathlib import Path
from typing import Optional, Dict, Any

from PIL import Image

try:
    import imagehash #type: ignore # optional; used for perceptual hash
except Exception:
    imagehash = None


# ---------- small utilities ----------

def _sha256_bytes(data: bytes) -> str:
    h = hashlib.sha256()
    h.update(data)
    return h.hexdigest()

def _phash_pil(im: Image.Image) -> Optional[str]:
    if imagehash is None:
        return None
    try:
        return str(imagehash.phash(im))
    except Exception:
        return None

def _now_iso_z() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


# ---------- public API ----------

def build_sidecar_schema(
    *,
    image_path: str,
    image_bytes: bytes,
    im: Image.Image,
    manufacturer: str,
    part_number: str,
    description: Optional[str] = None,
    image_url: Optional[str] = None,
    page_url: Optional[str] = None,
    referer: Optional[str] = None,
    scraper_version: str = "v0.1-sidecars"
) -> Dict[str, Any]:
    """
    Construct the authoritative JSON sidecar for an image.
    Returns a dict ready to dump to `<image>.json`.
    """
    p = Path(image_path)
    width, height = im.size
    phash = _phash_pil(im)
    return {
        "image": {
            "filename": p.name,
            "format": (im.format or "jpeg").lower(),
            "width": int(width),
            "height": int(height),
            "filesize": int(len(image_bytes)),
            "sha256": _sha256_bytes(image_bytes),
            "phash": phash,
        },
        "product": {
            "manufacturer": str(manufacturer),
            "sku": str(part_number),
            "description": description,
            "category": None
        },
        "source": {
            "image_url": image_url,
            "page_url": page_url,
            "referer": referer,
            "license_hint": None,
            "found_at": _now_iso_z()
        },
        "ml": {
            "garbage": {
                "label": "pending",
                "score": None,
                "reason": None,
                "model": None,
                "model_version": None,
                "pos_sim": None,
                "neg_sim": None,
                "margin": None,
                "tagged_at": None
            }
        },
        "pipeline": {
            "scraper_version": scraper_version,
            "notes": []
        }
    }

def write_sidecar_json(image_path: str, sidecar: Dict[str, Any], *, pretty: bool = False) -> str:
    """
    Write `<image>.<ext>.json` next to the image.
    Returns the sidecar file path.
    """
    sidecar_path = f"{image_path}.json"
    with open(sidecar_path, "w", encoding="utf-8") as f:
        if pretty:
            json.dump(sidecar, f, ensure_ascii=False, indent=2)
        else:
            json.dump(sidecar, f, ensure_ascii=False)
    return sidecar_path

def copy_sidecars_from_staging(staging_dir: str, dest_dir: str) -> None:
    """
    Copy matching sidecars from `staging_dir` to `dest_dir`.
    Assumes resized images keep the same filename.
    """
    sdir = Path(staging_dir)
    ddir = Path(dest_dir)
    if not ddir.exists():
        return

    # Build quick lookup of staged sidecars: both exact "<name>.jpg.json" and by stem
    staged_exact = {p.name: p for p in sdir.glob("*.json")}
    staged_by_stem = {p.stem: p for p in sdir.glob("*.json")}  # stem includes ".jpg" -> ".jpg"

    for img in ddir.glob("*.jpg"):
        # Primary: exact filename match "<filename>.json"
        exact = img.name + ".json"
        if exact in staged_exact:
            shutil.copy2(staged_exact[exact], ddir / exact)
            continue
        # Fallback: stem match (if some process wrote different ext)
        key = img.name  # because staged_by_stem uses "filename.ext" as stem (from ".json")
        if key in staged_by_stem:
            shutil.copy2(staged_by_stem[key], ddir / (img.name + ".json"))


__all__ = [
    "build_sidecar_schema",
    "write_sidecar_json",
    "copy_sidecars_from_staging",
]
