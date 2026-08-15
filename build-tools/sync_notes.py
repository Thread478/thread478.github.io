#!/usr/bin/env python3
"""Rebuild the LaTeX notes directly into a website checkout."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
DEFAULT_CONFIG = ROOT / "sync-config.json"


def resolve_path(value: str, *, base: Path) -> Path:
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = base / path
    return path.resolve()


def load_config(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"无法读取同步配置 {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise SystemExit(f"同步配置必须是 JSON 对象：{path}")
    return data


def main() -> int:
    parser = argparse.ArgumentParser(description="把 LaTeX 札记重新生成到网站目录")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG, help="同步配置文件")
    parser.add_argument("--source", help="LaTeX 工程根目录；覆盖配置文件")
    parser.add_argument("--site", help="网站仓库根目录；覆盖配置文件")
    args = parser.parse_args()

    config_path = args.config.expanduser().resolve()
    config = load_config(config_path)
    source_value = args.source or config.get("latex_source")
    site_value = args.site or config.get("site_root")
    output_value = config.get("output", "notes/ag")

    if not source_value or not site_value:
        raise SystemExit(
            "缺少路径。请复制 sync-config.example.json 为 sync-config.json，"
            "并填写 latex_source 与 site_root。"
        )

    base = config_path.parent
    source = resolve_path(str(source_value), base=base)
    site = resolve_path(str(site_value), base=base)
    output_relative = Path(str(output_value))
    if output_relative.is_absolute() or ".." in output_relative.parts or output_relative == Path("."):
        raise SystemExit("output 必须是网站仓库内的相对路径，例如 notes/ag")
    output = (site / output_relative).resolve()

    if not source.is_dir() or not (source / "chapters").is_dir():
        raise SystemExit(f"LaTeX 工程不完整（应包含 chapters/）：{source}")
    if not site.is_dir():
        raise SystemExit(f"网站仓库不存在：{site}")
    if output == site or site not in output.parents:
        raise SystemExit("拒绝覆盖网站根目录；output 必须指向网站内的专用子目录")
    required_tools = (
        "build_notes.py",
        "notes-manifest.json",
        "notes-template.html",
        "notes.css",
        "notes.js",
        "render_tikzcd.py",
        "tikzcd.lua",
        "web-main.tex",
        "web-structure.tex",
    )
    missing_tools = [name for name in required_tools if not (ROOT / "tools" / name).is_file()]
    if missing_tools:
        raise SystemExit("构建工具不完整，缺少：" + ", ".join(missing_tools))
    if not (ROOT / "node_modules" / "katex" / "dist").is_dir():
        raise SystemExit(f"KaTeX 尚未安装。请先在 {ROOT} 运行 npm install")

    env = os.environ.copy()
    env["THREAD478_NOTES_SOURCE"] = str(source)
    env["THREAD478_NOTES_OUTPUT"] = str(output)
    print(f"LaTeX: {source}")
    print(f"网站:  {output}")
    result = subprocess.run(
        [sys.executable, str(ROOT / "tools" / "build_notes.py")],
        cwd=ROOT,
        env=env,
        check=False,
    )
    if result.returncode:
        return result.returncode
    print("同步完成。预览确认后，在网站仓库提交并推送这些生成文件即可上线。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
