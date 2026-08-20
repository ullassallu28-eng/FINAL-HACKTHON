"""Load and inspect uploaded evidence images for farm-relevance signals."""

from __future__ import annotations

import base64
import io
import re
import uuid
from dataclasses import dataclass

from PIL import Image
from sqlalchemy.orm import Session

from app.models.file_upload import FileUpload


@dataclass
class ImageAssessment:
    valid_image: bool
    width: int = 0
    height: int = 0
    format: str = ""
    color_variance: float = 0.0
    likely_screenshot: bool = False
    likely_unrelated_visual: bool = False
    mime_type: str = ""
    content_base64: str = ""

    def to_dict(self) -> dict:
        return {
            "validImage": self.valid_image,
            "width": self.width,
            "height": self.height,
            "format": self.format,
            "colorVariance": round(self.color_variance, 2),
            "likelyScreenshot": self.likely_screenshot,
            "likelyUnrelatedVisual": self.likely_unrelated_visual,
        }


def file_upload_from_url(db: Session | None, url: str | None) -> FileUpload | None:
    if not db or not url:
        return None
    match = re.search(r"/api/v1/media/([0-9a-f-]{36})", url, re.I)
    if not match:
        return None
    try:
        file_id = uuid.UUID(match.group(1))
    except ValueError:
        return None
    return db.query(FileUpload).filter(FileUpload.id == file_id).first()


def load_image_bytes(db: Session | None, file_url: str | None) -> tuple[bytes | None, FileUpload | None]:
    record = file_upload_from_url(db, file_url)
    if not record:
        return None, None
    if record.content_base64:
        try:
            return base64.b64decode(record.content_base64), record
        except (ValueError, TypeError):
            pass
    try:
        from pathlib import Path

        path = Path(record.file_path)
        if path.is_file():
            return path.read_bytes(), record
    except OSError:
        pass
    return None, record


def assess_image(data: bytes | None) -> ImageAssessment:
    if not data:
        return ImageAssessment(valid_image=False)

    try:
        img = Image.open(io.BytesIO(data))
        rgb = img.convert("RGB")
        w, h = rgb.size
        pixels = list(rgb.getdata())
        step = max(1, len(pixels) // 4000)
        sample = pixels[::step]
        if not sample:
            return ImageAssessment(valid_image=False)

        mean_r = sum(p[0] for p in sample) / len(sample)
        mean_g = sum(p[1] for p in sample) / len(sample)
        mean_b = sum(p[2] for p in sample) / len(sample)
        variance = sum(
            (p[0] - mean_r) ** 2 + (p[1] - mean_g) ** 2 + (p[2] - mean_b) ** 2
            for p in sample
        ) / len(sample)

        aspect = w / h if h else 1
        likely_screenshot = aspect > 2.2 or (w >= 1080 and h >= 1920 and variance < 1200)
        likely_unrelated = variance < 350 and w * h > 80000

        return ImageAssessment(
            valid_image=True,
            width=w,
            height=h,
            format=img.format or "",
            color_variance=variance,
            likely_screenshot=likely_screenshot,
            likely_unrelated_visual=likely_unrelated,
        )
    except Exception:
        return ImageAssessment(valid_image=False)
