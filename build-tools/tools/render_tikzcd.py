#!/usr/bin/env python3
"""Render one tikz-cd block from stdin into a cached SVG."""

from __future__ import annotations

import pathlib
import re
import subprocess
import sys
import tempfile


PREAMBLE = r"""\documentclass[tikz,border=8pt]{standalone}
\usepackage[T1]{fontenc}
\usepackage{amsmath,amssymb,mathtools}
\usepackage{tikz-cd}
\usetikzlibrary{arrows.meta,calc,decorations.pathmorphing}
\tikzset{
  curve/.style={settings={#1},to path={
    (\tikztostart)
    .. controls ($ (\tikztostart)!\pv{pos}!(\tikztotarget)!\pv{height}!270:(\tikztotarget) $)
    and ($ (\tikztostart)!\pv{pos}!(\tikztotarget)!\pv{height}!270:(\tikztostart) $)
    .. (\tikztotarget)\tikztonodes
  }},
  settings/.code={\tikzset{quiver/.cd,#1}\def\pv##1{\pgfkeysvalueof{/tikz/quiver/##1}}},
  quiver/.cd,pos/.initial=0.35,height/.initial=0
}
\newcommand{\Spec}{\operatorname{Spec}}
\newcommand{\Hom}{\operatorname{Hom}}
\newcommand{\supp}{\operatorname{supp}}
\newcommand{\Proj}{\operatorname{Proj}}
\newcommand{\Mod}{\mathsf{Mod}}
\newcommand{\QCoh}{\mathsf{QCoh}}
\newcommand{\Ch}{\mathsf{Ch}}
\newcommand{\D}{\mathbf{D}}
\newcommand{\cF}{\mathcal{F}}
\newcommand{\RHom}{\mathbf{R}\operatorname{Hom}}
\newcommand{\RGam}{\mathbf{R}\Gamma}
\newcommand{\RcHom}{\mathbf{R}\mathcal{H}om}
\newcommand{\p}{\mathfrak{p}}
\newcommand{\m}{\mathfrak{m}}
\newcommand{\cO}{\mathcal O}
\newcommand{\Dbcoh}{\mathbf D^b_{\mathrm{coh}}}
\newcommand{\Dqc}{\mathbf D_{\mathrm{qc}}}
\newcommand{\Perf}{\operatorname{Perf}}
\newcommand{\Coh}{\operatorname{Coh}}
\newcommand{\Supp}{\operatorname{Supp}}
\newcommand{\codim}{\operatorname{codim}}
\newcommand{\Lotimes}{\mathbin{\otimes^{\mathbf L}}}
\newcommand{\Kzero}{K_0}
\newcommand{\Gzero}{G_0}
\newcommand{\Z}{\mathbf Z}
\DeclareMathOperator{\rk}{rk}
\begin{document}
"""


def run(command: list[str], cwd: pathlib.Path) -> None:
    result = subprocess.run(
        command,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    if result.returncode:
        tail = "\n".join(result.stdout.splitlines()[-35:])
        raise RuntimeError(f"diagram command failed: {' '.join(command)}\n{tail}")


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: render_tikzcd.py OUTPUT_DIR HASH", file=sys.stderr)
        return 2

    output_dir = pathlib.Path(sys.argv[1]).resolve()
    digest = sys.argv[2]
    destination = output_dir / f"{digest}.svg"
    output_dir.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        print(destination.name)
        return 0

    raw_source = sys.stdin.read().strip()
    match = re.search(r"\\begin\{tikzcd\}[\s\S]*?\\end\{tikzcd\}", raw_source)
    if not match:
        raise ValueError("stdin does not contain a tikzcd block")
    source = match.group(0)
    # Quiver's 2-cell `between` helper is not part of tikz-cd itself. The two
    # occurrences in these notes annotate Kan-extension diagrams whose labels
    # are already stated in the surrounding prose; omit only those helper
    # arrows while preserving the underlying commutative diagram.
    has_quiver_two_cell = "between={" in source
    source = re.sub(r"^.*\\arrow\[[^\n]*between=\{[^\n]*$", "", source, flags=re.MULTILINE)
    source = re.sub(r'""\{name=[^}]+\},\s*', "", source)
    if has_quiver_two_cell:
        source = re.sub(r'^.*\\arrow\["G"[^\n]*curve=\{height=30pt\}[^\n]*$', "", source, flags=re.MULTILINE)
    source = source.replace("color={rgb,255:UniBlue,255;green,51;blue,61}", "color=blue")
    source = re.sub(r"\n[ \t]*\n+", "\n", source)

    with tempfile.TemporaryDirectory(prefix="thread478-diagram-") as temp_name:
        temp_dir = pathlib.Path(temp_name)
        tex_file = temp_dir / "diagram.tex"
        tex_file.write_text(PREAMBLE + source + "\n\\end{document}\n", encoding="utf-8")
        try:
            run(["pdflatex", "-interaction=nonstopmode", "-halt-on-error", "diagram.tex"], temp_dir)
        except RuntimeError:
            print("--- failing tikzcd source ---", file=sys.stderr)
            print(source, file=sys.stderr)
            raise
        run(["pdftocairo", "-svg", "diagram.pdf", str(destination)], temp_dir)

    if not destination.exists():
        raise RuntimeError(f"renderer did not create {destination}")
    print(destination.name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
