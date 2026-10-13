// npm run make-fixtures — writes the invented test syllabi (PDFs) and their answer keys (JSON).
// Output: test-fixtures/syllabi/<name>.pdf and test-fixtures/expected/<name>.json
import { mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { FIXTURES, type Fixture } from "./fixtures/syllabi";

const PAGE_W = 612; // US Letter, in points
const PAGE_H = 792;
const MARGIN = 56;
const SIZE = 10.5;
const LINE = 15;

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function render(fixture: Fixture): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(fixture.title[0]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  const width = PAGE_W - 2 * MARGIN;

  const ensureRoom = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };
  const write = (text: string, font: PDFFont, size: number, x = MARGIN) => {
    ensureRoom(LINE);
    page.drawText(text, { x, y, size, font });
    y -= LINE;
  };

  write(fixture.title[0], bold, 16);
  y -= 4;
  write(fixture.title[1], regular, SIZE);
  y -= 10;

  for (const block of fixture.blocks) {
    if (block.heading) {
      y -= 6;
      write(block.heading, bold, 12);
    }
    if (block.text) {
      for (const line of wrap(block.text, regular, SIZE, width)) write(line, regular, SIZE);
      y -= 6;
    }
    if (block.table) {
      const columns = block.table[0].length;
      const colWidth = width / columns;
      block.table.forEach((row, rowIndex) => {
        const font = rowIndex === 0 ? bold : regular;
        const cells = row.map((cell) => wrap(cell, font, SIZE, colWidth - 8));
        const height = Math.max(...cells.map((c) => c.length)) * LINE;
        ensureRoom(height);
        cells.forEach((lines, col) =>
          lines.forEach((text, i) =>
            page.drawText(text, { x: MARGIN + col * colWidth, y: y - i * LINE, size: SIZE, font }),
          ),
        );
        y -= height + 3;
      });
      y -= 6;
    }
  }
  return pdf.save();
}

async function main() {
  mkdirSync("test-fixtures/syllabi", { recursive: true });
  mkdirSync("test-fixtures/expected", { recursive: true });
  for (const fixture of FIXTURES) {
    writeFileSync(`test-fixtures/syllabi/${fixture.name}.pdf`, await render(fixture));
    writeFileSync(`test-fixtures/expected/${fixture.name}.json`, JSON.stringify(fixture.expected, null, 2) + "\n");
    console.log(`✓ ${fixture.name}.pdf (${fixture.expected.assessments.length} items in the answer key)`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
