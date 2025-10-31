import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function POST(req: NextRequest) {
    const {
        title = 'Tutorial PDF',
        steps = [],
        createdByName = 'Unknown',
        createdById = null,
    } = await req.json();

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const MARGIN_LEFT = 50;
    const MARGIN_RIGHT = 50;
    const MARGIN_TOP = 50;
    const MARGIN_BOTTOM = 50;

    const TITLE_SIZE = 24;
    const HEADER_SIZE = 18;
    const STEP_SIZE = 14;
    const LINE_HEIGHT = 18;

    // helper: create a new page and return an object with page, width, height and current y
    const newPage = () => {
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        return { page, width, height, y: height - MARGIN_TOP };
    };

    // helper: wrap text to lines that fit within maxWidth using font metrics
    const wrapText = (text: string, fontSize: number, maxWidth: number): string[] => {
        const words = String(text).split(/\s+/);
        const lines: string[] = [];
        let current = '';

        for (const w of words) {
            const test = current ? `${current} ${w}` : w;
            const testWidth = font.widthOfTextAtSize(test, fontSize);
            if (testWidth <= maxWidth) {
                current = test;
            } else {
                if (current) lines.push(current);
                // If a single word is longer than maxWidth, break the word
                if (font.widthOfTextAtSize(w, fontSize) > maxWidth) {
                    let chunk = '';
                    for (const ch of w) {
                        const t = chunk + ch;
                        if (font.widthOfTextAtSize(t, fontSize) <= maxWidth) {
                            chunk = t;
                        } else {
                            if (chunk) lines.push(chunk);
                            chunk = ch;
                        }
                    }
                    if (chunk) current = chunk;
                    else current = '';
                } else {
                    current = w;
                }
            }
        }
        if (current) lines.push(current);
        return lines;
    };

    // start first page
    let { page, width, height, y: cursorY } = newPage();

    const availableWidth = (w: number) => w - MARGIN_LEFT - MARGIN_RIGHT;

    // function to ensure there's enough space; if not, create new page and update page/width/height/cursorY
    const ensureSpace = (requiredHeight: number) => {
        if (cursorY - requiredHeight < MARGIN_BOTTOM) {
            const p = newPage();
            page = p.page;
            width = p.width;
            height = p.height;
            cursorY = p.y;
        }
    };

    // draw wrapped lines helper
    const drawLines = (lines: string[], size: number, xOffset = MARGIN_LEFT) => {
        for (const line of lines) {
            ensureSpace(LINE_HEIGHT);
            page.drawText(line, {
                x: xOffset,
                y: cursorY,
                size,
                font,
                color: rgb(0, 0, 0),
            });
            cursorY -= LINE_HEIGHT;
        }
    };

    // Title
    const titleLines = wrapText(title, TITLE_SIZE, availableWidth(width));
    drawLines(titleLines, TITLE_SIZE);
    cursorY -= 10; // extra spacing

    // Header "Steps:"
    const headerLines = wrapText('Steps:', HEADER_SIZE, availableWidth(width));
    drawLines(headerLines, HEADER_SIZE);
    cursorY -= 6;

    // Steps
    (steps as string[]).forEach((step, idx) => {
        const stepPrefix = `${idx + 1}. `;
        // wrap step text but account prefix width on first line
        const maxW = availableWidth(width);
        const prefixWidth = font.widthOfTextAtSize(stepPrefix, STEP_SIZE);
        const wrapped = wrapText(step, STEP_SIZE, maxW - prefixWidth);

        if (wrapped.length === 0) {
            ensureSpace(LINE_HEIGHT);
            page.drawText(stepPrefix, { x: MARGIN_LEFT, y: cursorY, size: STEP_SIZE, font });
            cursorY -= LINE_HEIGHT;
        } else {
            // draw first line with prefix
            ensureSpace(LINE_HEIGHT);
            page.drawText(stepPrefix + wrapped[0], {
                x: MARGIN_LEFT,
                y: cursorY,
                size: STEP_SIZE,
                font,
                color: rgb(0, 0, 0),
            });
            cursorY -= LINE_HEIGHT;
            // remaining lines aligned with text (indented)
            for (let i = 1; i < wrapped.length; i++) {
                ensureSpace(LINE_HEIGHT);
                page.drawText(wrapped[i], {
                    x: MARGIN_LEFT + prefixWidth,
                    y: cursorY,
                    size: STEP_SIZE,
                    font,
                    color: rgb(0, 0, 0),
                });
                cursorY -= LINE_HEIGHT;
            }
        }
        cursorY -= 6; // spacing between steps
    });

    // Add watermark (creator name) on every page centered, low-opacity
    const pages = pdfDoc.getPages();
    const watermarkText = String(createdByName || 'Unknown');
    const watermarkSize = 40;
    for (const p of pages) {
        const { width: pw, height: ph } = p.getSize();
        const textWidth = font.widthOfTextAtSize(watermarkText, watermarkSize);
        const x = (pw - textWidth) / 2;
        const y = ph / 2;
        // draw faint watermark
        p.drawText(watermarkText, {
            x,
            y,
            size: watermarkSize,
            font,
            color: rgb(0.75, 0.75, 0.75),
            opacity: 0.12 as unknown as number, // some environments/types may need this cast
        });
    }

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="tutorial.pdf"',
        },
    });
}
