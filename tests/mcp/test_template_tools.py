import json
from unittest.mock import patch


async def test_template_list(tmp_path):
    from app.mcp.tools.templates import template_list

    # Create fake template files
    (tmp_path / "aaa-id.png").write_bytes(b"fake-png")
    (tmp_path / "bbb-id.jpg").write_bytes(b"fake-jpg")
    (tmp_path / "not-image.txt").write_text("ignore")

    with patch("app.mcp.tools.templates.TEMPLATES_DIR", tmp_path):
        result = json.loads(template_list())

    assert len(result) == 2
    assert result[0]["id"] == "aaa-id"
    assert result[0]["filename"] == "aaa-id.png"
    assert result[1]["id"] == "bbb-id"


async def test_template_list_empty(tmp_path):
    from app.mcp.tools.templates import template_list

    with patch("app.mcp.tools.templates.TEMPLATES_DIR", tmp_path):
        result = json.loads(template_list())

    assert result == []


async def test_template_get_image(tmp_path):
    from app.mcp.tools.templates import template_get_image

    (tmp_path / "tpl-123.png").write_bytes(b"\x89PNG fake data")

    with patch("app.mcp.tools.templates.TEMPLATES_DIR", tmp_path):
        result = json.loads(template_get_image("tpl-123"))

    assert result["id"] == "tpl-123"
    assert result["mime"] == "image/png"
    assert "image" in result  # base64 data


async def test_template_get_image_not_found(tmp_path):
    from app.mcp.tools.templates import template_get_image

    with patch("app.mcp.tools.templates.TEMPLATES_DIR", tmp_path):
        result = json.loads(template_get_image("nonexistent"))

    assert "error" in result


async def test_template_delete(tmp_path):
    from app.mcp.tools.templates import template_delete

    tpl_file = tmp_path / "del-me.png"
    tpl_file.write_bytes(b"fake")

    with patch("app.mcp.tools.templates.TEMPLATES_DIR", tmp_path):
        result = json.loads(template_delete("del-me"))

    assert result["ok"] is True
    assert not tpl_file.exists()


async def test_template_delete_not_found(tmp_path):
    from app.mcp.tools.templates import template_delete

    with patch("app.mcp.tools.templates.TEMPLATES_DIR", tmp_path):
        result = json.loads(template_delete("nonexistent"))

    assert "error" in result
