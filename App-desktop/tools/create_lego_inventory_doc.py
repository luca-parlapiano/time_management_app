import json
import os
from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_ROW_HEIGHT_RULE
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from PIL import Image, ImageDraw, ImageFont, ImageOps
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas as pdf_canvas


MANIFEST = Path(
    "/var/folders/r3/3crf10jj76v61p4r3gyyxn1r0000gn/T/browser-use/assets/"
    "01247cdb-96a2-48eb-8592-9ef077af9b4e/manifest.json"
)
OUTPUT = Path("artifacts/lego_6986_inventario_compatto.docx")
PDF_OUTPUT = Path("output/pdf/lego_6986_inventario_compatto.pdf")
PAGE_IMAGE_DIR = Path("/private/tmp/lego_6986_page_images")

QUANTITIES = [
    4, 2, 6, 10, 2, 3, 1, 2, 4, 2, 1, 2, 8, 3, 2, 2, 1, 4, 2, 2,
    4, 6, 17, 9, 13, 16, 4, 6, 2, 2, 1, 3, 2, 3, 1, 4, 1, 9, 2, 3,
    2, 2, 3, 2, 4, 1, 2, 13, 4, 1, 1, 1, 7, 6, 1, 5, 4, 1, 4, 1,
    1, 3, 1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 6, 2, 1, 2, 2, 4, 8, 1,
    3, 2, 4, 4, 2, 1, 2, 4, 4, 9, 15, 9, 4, 6, 5, 5, 4, 3, 1,
    1, 1, 1, 1, 5, 1, 1, 2, 2, 2, 1, 2, 6, 3, 2, 2, 2, 1, 2, 8,
    2, 2, 1, 8, 2, 8, 2, 5, 1, 4, 2, 8,
]


def set_cell_margins(cell, top=45, start=45, bottom=35, end=45):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_table_borders(table, color="D9D9D9", size="6"):
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.find(qn("w:tblBorders"))
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = borders.find(qn(f"w:{edge}"))
        if el is None:
            el = OxmlElement(f"w:{edge}")
            borders.append(el)
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), size)
        el.set(qn("w:color"), color)


def set_table_width(table, width_twips):
    tbl_pr = table._tbl.tblPr
    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:w"), str(width_twips))
    tbl_w.set(qn("w:type"), "dxa")


def keep_row_together(row):
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)


def remove_paragraph_borders(paragraph):
    p_pr = paragraph._p.get_or_add_pPr()
    p_bdr = p_pr.find(qn("w:pBdr"))
    if p_bdr is None:
        p_bdr = OxmlElement("w:pBdr")
        p_pr.append(p_bdr)
    for edge in ("top", "left", "bottom", "right", "between", "bar"):
        element = p_bdr.find(qn(f"w:{edge}"))
        if element is None:
            element = OxmlElement(f"w:{edge}")
            p_bdr.append(element)
        element.set(qn("w:val"), "nil")


def label_for(url):
    if "/M/" in url:
        return "MINIFIG"
    color_id = url.split("/P/")[1].split("/")[0]
    return {"11": "NERO", "7": "BLU", "17": "ROSSO TRASP.", "1": "BIANCO"}.get(color_id, "")


def load_items():
    manifest = json.loads(MANIFEST.read_text())
    assets = [
        asset for asset in manifest["assets"]
        if "img.bricklink.com/P/" in asset["url"] or "img.bricklink.com/M/" in asset["url"]
    ]
    if len(assets) != len(QUANTITIES):
        raise RuntimeError(f"Attese {len(QUANTITIES)} immagini, trovate {len(assets)}")
    items = []
    for index, (asset, qty) in enumerate(zip(assets, QUANTITIES, strict=True)):
        code = Path(asset["url"]).stem
        items.append({"code": code, "qty": qty, "image": Path(asset["path"]), "url": asset["url"], "counterpart": index == 130})
    return items


def text_width(draw, text, font):
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0]


def create_grid_image(page_items, page_number):
    width = 2346
    columns = 4
    rows = (len(page_items) + columns - 1) // columns
    cell_width = width // columns
    cell_height = 430
    height = rows * cell_height + 2
    canvas = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(canvas)
    font_regular = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 25)
    font_bold = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 34)
    font_qty = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 42)

    for row in range(rows + 1):
        y = min(row * cell_height, height - 2)
        draw.line((0, y, width, y), fill="#D9D9D9", width=2)
    for column in range(columns + 1):
        x = min(column * cell_width, width - 2)
        draw.line((x, 0, x, height), fill="#D9D9D9", width=2)

    for index, item in enumerate(page_items):
        row, column = divmod(index, columns)
        x0 = column * cell_width
        y0 = row * cell_height
        if item["counterpart"]:
            draw.rectangle((x0 + 2, y0 + 2, x0 + cell_width - 2, y0 + cell_height - 2), fill="#FFF6D6")

        with Image.open(item["image"]) as source:
            source = source.convert("RGB")
            source = ImageOps.contain(source, (300, 235), Image.Resampling.LANCZOS)
            image_x = x0 + (cell_width - source.width) // 2
            image_y = y0 + 28 + (235 - source.height) // 2
            canvas.paste(source, (image_x, image_y))

        code_y = y0 + 275
        code_x = x0 + (cell_width - text_width(draw, item["code"], font_bold)) // 2
        draw.text((code_x, code_y), item["code"], font=font_bold, fill="#000000")

        qty_text = f"{item['qty']} pz"
        label = label_for(item["url"])
        gap = 18
        total_width = text_width(draw, qty_text, font_qty) + gap + text_width(draw, label, font_regular)
        meta_x = x0 + (cell_width - total_width) // 2
        draw.text((meta_x, y0 + 320), qty_text, font=font_qty, fill="#B00020")
        draw.text((meta_x + text_width(draw, qty_text, font_qty) + gap, y0 + 334), label, font=font_regular, fill="#505050")

    PAGE_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    path = PAGE_IMAGE_DIR / f"griglia-{page_number}.jpg"
    canvas.save(path, dpi=(300, 300), quality=95, subsampling=0)
    return path, height / 300


def add_item(cell, item):
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    set_cell_margins(cell)
    if item["counterpart"]:
        set_cell_shading(cell, "FFF6D6")

    p_img = cell.paragraphs[0]
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_after = Pt(0)
    p_img.paragraph_format.line_spacing = 1
    run = p_img.add_run()
    run.add_picture(str(item["image"]), width=Inches(0.74), height=Inches(0.62))

    p_code = cell.add_paragraph()
    p_code.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_code.paragraph_format.space_before = Pt(0)
    p_code.paragraph_format.space_after = Pt(0)
    p_code.paragraph_format.line_spacing = 0.85
    code_run = p_code.add_run(item["code"])
    code_run.bold = True
    code_run.font.name = "Arial"
    code_run.font.size = Pt(8.5)
    code_run.font.color.rgb = RGBColor(0, 0, 0)

    p_meta = cell.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_meta.paragraph_format.space_before = Pt(0)
    p_meta.paragraph_format.space_after = Pt(0)
    p_meta.paragraph_format.line_spacing = 0.85
    qty_run = p_meta.add_run(f"{item['qty']} pz")
    qty_run.bold = True
    qty_run.font.name = "Arial"
    qty_run.font.size = Pt(11)
    qty_run.font.color.rgb = RGBColor(176, 0, 32)
    label_run = p_meta.add_run(f"  {label_for(item['url'])}")
    label_run.font.name = "Arial"
    label_run.font.size = Pt(6.5)
    label_run.font.color.rgb = RGBColor(70, 70, 70)


def create_document():
    items = load_items()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    doc = Document()
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.32)
    section.bottom_margin = Inches(0.32)
    section.left_margin = Inches(0.34)
    section.right_margin = Inches(0.34)
    section.header_distance = Inches(0.1)
    section.footer_distance = Inches(0.15)

    normal = doc.styles["Normal"]
    normal.font.name = "Arial"
    normal.font.size = Pt(8)
    normal.font.color.rgb = RGBColor(0, 0, 0)

    title = doc.add_paragraph(style="Title")
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.space_after = Pt(1)
    title.paragraph_format.keep_with_next = True
    title_run = title.add_run("LEGO 6986 Mission Commander Inventario compatto")
    title_run.font.name = "Arial"
    title_run.font.size = Pt(16)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(0, 0, 0)
    remove_paragraph_borders(title)

    intro = doc.add_paragraph()
    intro.alignment = WD_ALIGN_PARAGRAPH.CENTER
    intro.paragraph_format.space_after = Pt(4)
    intro.paragraph_format.keep_with_next = True
    intro_run = intro.add_run("131 voci  •  448 pezzi regolari e 3 minifigure  •  codice e quantità sotto ogni immagine")
    intro_run.font.name = "Arial"
    intro_run.font.size = Pt(7.5)
    intro_run.font.color.rgb = RGBColor(65, 65, 65)

    usable_width = 8.5 - 0.34 - 0.34
    items_per_page = 24
    for page_number, page_start in enumerate(range(0, len(items), items_per_page), start=1):
        if page_start:
            doc.add_page_break()
        page_items = items[page_start:page_start + items_per_page]
        grid_path, grid_height = create_grid_image(page_items, page_number)
        grid_paragraph = doc.add_paragraph()
        grid_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        grid_paragraph.paragraph_format.space_before = Pt(0)
        grid_paragraph.paragraph_format.space_after = Pt(0)
        grid_run = grid_paragraph.add_run()
        grid_run.add_picture(str(grid_path), width=Inches(usable_width), height=Inches(grid_height))

    note = doc.add_paragraph()
    note.paragraph_format.space_before = Pt(3)
    note.paragraph_format.space_after = Pt(0)
    note_run = note.add_run("Nota: la voce 3937c02 evidenziata in giallo è una controparte BrickLink di riferimento e non va sommata ai pezzi regolari.")
    note_run.font.name = "Arial"
    note_run.font.size = Pt(7)
    note_run.font.italic = True
    note_run.font.color.rgb = RGBColor(60, 60, 60)

    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer_run = footer.add_run("Fonte inventario e immagini: BrickLink  •  Set 6986-1")
    footer_run.font.name = "Arial"
    footer_run.font.size = Pt(6.5)
    footer_run.font.color.rgb = RGBColor(90, 90, 90)

    core = doc.core_properties
    core.title = "LEGO 6986 Mission Commander Inventario compatto"
    core.subject = "Lista stampabile dei pezzi del set LEGO 6986-1"
    core.author = ""
    core.keywords = "LEGO, 6986, Mission Commander, inventario, BrickLink"

    doc.save(OUTPUT)
    print(f"Creato {OUTPUT} con {len(items)} voci")


def create_pdf():
    items = load_items()
    PDF_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    page_width, page_height = letter
    margin_x = 24.5
    usable_width = page_width - 2 * margin_x
    pdf = pdf_canvas.Canvas(str(PDF_OUTPUT), pagesize=letter, pageCompression=1)
    pdf.setTitle("LEGO 6986 Mission Commander Inventario compatto")
    pdf.setAuthor("")
    pdf.setSubject("Lista stampabile dei pezzi del set LEGO 6986-1")

    items_per_page = 24
    for page_number, page_start in enumerate(range(0, len(items), items_per_page), start=1):
        page_items = items[page_start:page_start + items_per_page]
        grid_path, grid_height_inches = create_grid_image(page_items, page_number)

        if page_number == 1:
            pdf.setFont("Helvetica-Bold", 16)
            pdf.drawCentredString(page_width / 2, page_height - 31, "LEGO 6986 Mission Commander Inventario compatto")
            pdf.setFillColorRGB(0.25, 0.25, 0.25)
            pdf.setFont("Helvetica", 7.5)
            pdf.drawCentredString(page_width / 2, page_height - 47, "131 voci  -  448 pezzi regolari e 3 minifigure  -  codice e quantita sotto ogni immagine")
            grid_top = page_height - 55
        else:
            grid_top = page_height - 22

        grid_height = grid_height_inches * 72
        pdf.drawImage(str(grid_path), margin_x, grid_top - grid_height, width=usable_width, height=grid_height, preserveAspectRatio=True, mask="auto")

        if page_number == 6:
            note_y = grid_top - grid_height - 12
            pdf.setFillColorRGB(0.25, 0.25, 0.25)
            pdf.setFont("Helvetica-Oblique", 7)
            pdf.drawString(margin_x, note_y, "Nota: la voce 3937c02 evidenziata in giallo e una controparte BrickLink di riferimento e non va sommata ai pezzi regolari.")

        pdf.setFillColorRGB(0.35, 0.35, 0.35)
        pdf.setFont("Helvetica", 6.5)
        pdf.drawCentredString(page_width / 2, 10, "Fonte inventario e immagini: BrickLink  -  Set 6986-1")
        pdf.showPage()

    pdf.save()
    print(f"Creato {PDF_OUTPUT} con 6 pagine")


if __name__ == "__main__":
    create_document()
    create_pdf()
