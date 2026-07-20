#!/usr/bin/env python3
"""Render the KOI customer guide .docx to a styled .pdf.

pandoc's docx reader does not map this document's Heading1/Heading2 styles onto
real headings (it emits <p><strong>...</strong></p>), and it places every table
row inside <thead> as <th>. Both are corrected here before handing the HTML to
wkhtmltopdf, so the PDF keeps the structure and looks like the Word document.

Usage:  python3 build_pdf.py [guide.docx]
Requires: pandoc, wkhtmltopdf.
"""
import re
import subprocess
import sys
from pathlib import Path

DOCX = Path(sys.argv[1] if len(sys.argv) > 1
            else Path(__file__).parent / "KOI_Integration_Customer_Guide_v1.3.0.docx")
PDF = DOCX.with_suffix(".pdf")

CSS = """
@page { margin: 16mm 15mm; }
body { font-family: Helvetica, Arial, sans-serif; font-size: 10.5pt; color: #1F2937; line-height: 1.45; }
h1 { color: #E8551F; font-size: 16pt; border-bottom: 2px solid #E8551F; padding-bottom: 4px;
     margin: 22px 0 10px; page-break-after: avoid; }
h2 { color: #1F2937; font-size: 12.5pt; margin: 16px 0 6px; page-break-after: avoid; }
p  { margin: 6px 0; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9pt;
        page-break-inside: avoid; }
th, td { border: 1px solid #CBD5E1; padding: 5px 8px; text-align: left; vertical-align: top;
         background: #FFFFFF; color: #1F2937; font-weight: normal; }
thead tr:first-child th { background: #334155; color: #FFFFFF; font-weight: bold; }
thead tr:first-child th strong { color: #FFFFFF; }
tbody tr:nth-child(even) td { background: #F8FAFC; }
code { font-family: Menlo, Consolas, monospace; font-size: 8.8pt; background: #F3F4F6; padding: 1px 4px; }
pre  { font-family: Menlo, Consolas, monospace; font-size: 8.8pt; background: #F3F4F6;
       padding: 7px 9px; border-left: 3px solid #E8551F; white-space: pre-wrap; }
ul, ol { margin: 6px 0 6px 20px; }
li { margin: 2px 0; }
.cover-title { color: #E8551F; font-size: 26pt; font-weight: bold; margin-bottom: 2px; }
.toc { font-size: 10pt; }
.toc a { color: #1F2937; text-decoration: none; }
.toc .l2 { margin-left: 18px; color: #475569; }
"""


def promote_headings(doc: str) -> str:
    """<p><strong>3.1 Foo</strong></p> -> <h2>, <p><strong>3. Foo</strong></p> -> <h1>."""
    def repl(m):
        text = m.group(1).strip()
        if re.match(r"^\d+\.\d+\s+\S", text):
            return f"<h2>{text}</h2>"
        if re.match(r"^\d+\.\s+\S", text):
            return f"<h1>{text}</h1>"
        return m.group(0)
    return re.sub(r"<p><strong>([^<]+)</strong></p>", repl, doc)


def fix_tables(doc: str) -> str:
    """pandoc puts every row in <thead> as <th>; keep row 1 as header, rest become <td>."""
    def repl(m):
        table = m.group(0)
        rows = re.findall(r"<tr>.*?</tr>", table, flags=re.S)
        if len(rows) < 2:
            return table
        head, body = rows[0], rows[1:]
        body = [r.replace("<th>", "<td>").replace("</th>", "</td>") for r in body]
        colgroup = re.search(r"<colgroup>.*?</colgroup>", table, flags=re.S)
        return ("<table>" + (colgroup.group(0) if colgroup else "")
                + "<thead>" + head + "</thead><tbody>" + "".join(body) + "</tbody></table>")
    return re.sub(r"<table>.*?</table>", repl, doc, flags=re.S)


def build_toc(doc: str):
    """Anchor headings and build a linked contents list."""
    entries, counter = [], [0]

    def repl(m):
        level, text = m.group(1), m.group(2)
        counter[0] += 1
        anchor = f"s{counter[0]}"
        entries.append((level, text, anchor))
        return f'<h{level} id="{anchor}">{text}</h{level}>'

    doc = re.sub(r"<h([12])>([^<]+)</h\1>", repl, doc)
    # `t` already carries pandoc's HTML escaping — re-escaping would render "&amp;" literally
    items = "".join(
        f'<div class="l{lvl}"><a href="#{a}">{t}</a></div>'
        for lvl, t, a in entries
    )
    toc = f'<h1>Contents</h1><div class="toc">{items}</div><div style="page-break-after:always"></div>'
    return doc, toc


def main():
    if not DOCX.exists():
        sys.exit(f"missing: {DOCX}")
    frag = subprocess.run(["pandoc", "-t", "html", str(DOCX)],
                          capture_output=True, text=True, check=True).stdout
    frag = promote_headings(frag)
    frag = fix_tables(frag)
    # drop the Word TOC-field placeholder; we generate our own
    frag = frag.replace("<p><strong>Table of Contents</strong></p>", "")
    frag, toc = build_toc(frag)
    page = (f"<!doctype html><html><head><meta charset='utf-8'>"
            f"<style>{CSS}</style></head><body>{toc}{frag}</body></html>")
    tmp = DOCX.with_suffix(".build.html")
    tmp.write_text(page, encoding="utf-8")
    subprocess.run(["wkhtmltopdf", "--quiet", "--enable-local-file-access",
                    "--footer-center", "KOI Integration — Customer User Guide   ·   [page] / [topage]",
                    "--footer-font-size", "8", "--footer-spacing", "5",
                    str(tmp), str(PDF)], check=True)
    tmp.unlink(missing_ok=True)
    print(f"written {PDF.name} ({PDF.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
