import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

router = APIRouter(prefix="/templates", tags=["templates"])

TEMPLATES_DIR = Path("data/templates")


def _ensure_dir() -> None:
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)


class TemplateUploadResponse(BaseModel):
    id: str
    filename: str


class TemplateListItem(BaseModel):
    id: str
    filename: str


@router.post("/upload", response_model=TemplateUploadResponse)
async def upload_template(file: UploadFile):
    """Upload a template image (from file picker or clipboard paste)."""
    _ensure_dir()
    ext = ".png"
    if file.filename:
        suffix = Path(file.filename).suffix
        if suffix in (".png", ".jpg", ".jpeg", ".bmp", ".webp"):
            ext = suffix
    template_id = str(uuid.uuid4())
    filename = f"{template_id}{ext}"
    path = TEMPLATES_DIR / filename
    content = await file.read()
    path.write_bytes(content)
    return TemplateUploadResponse(id=template_id, filename=filename)


@router.get("/list", response_model=list[TemplateListItem])
async def list_templates():
    """List all uploaded template images."""
    _ensure_dir()
    items = []
    for p in sorted(TEMPLATES_DIR.iterdir()):
        if p.is_file() and p.suffix in (".png", ".jpg", ".jpeg", ".bmp", ".webp"):
            stem = p.stem
            items.append(TemplateListItem(id=stem, filename=p.name))
    return items


@router.get("/{template_id}/preview")
async def preview_template(template_id: str):
    """Return the template image file for preview/thumbnail."""
    _ensure_dir()
    for p in TEMPLATES_DIR.iterdir():
        if p.stem == template_id:
            return FileResponse(p, media_type="image/png")
    from fastapi import HTTPException

    raise HTTPException(status_code=404, detail="Template not found")


@router.delete("/{template_id}")
async def delete_template(template_id: str):
    """Delete a template image."""
    _ensure_dir()
    for p in TEMPLATES_DIR.iterdir():
        if p.stem == template_id:
            p.unlink()
            return {"ok": True}
    from fastapi import HTTPException

    raise HTTPException(status_code=404, detail="Template not found")
