/**
 * Client-side PDF text extraction using pdf.js.
 *
 * The PDF is read from a File via FileReader (no fetch, no server, no upload),
 * then pdf.js extracts text per page in a Web Worker. We return one string per
 * page so downstream parsers can stay simple.
 *
 * Important privacy invariant: this module never makes a network request with
 * the PDF contents. The pdf.js worker is loaded from this site's own origin.
 */

import type { PDFDocumentProxy, TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

export interface ExtractedPdf {
  pageCount: number;
  pages: string[]; // text per page
  fullText: string; // pages joined with \n\n
}

let pdfjsModule: typeof import('pdfjs-dist') | null = null;

async function getPdfjs(): Promise<typeof import('pdfjs-dist')> {
  if (pdfjsModule) return pdfjsModule;
  const mod = await import('pdfjs-dist');
  // Load the worker from this same origin (matches CSP self-only requirement).
  // new URL(...) is statically analyzed by Next/Turbopack and emitted as an asset.
  mod.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  pdfjsModule = mod;
  return mod;
}

function readFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (result instanceof ArrayBuffer) resolve(result);
      else reject(new Error('FileReader returned non-ArrayBuffer'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsArrayBuffer(file);
  });
}

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return 'str' in item;
}

/**
 * Read a single page's text. We preserve approximate line breaks by inserting
 * a newline whenever the y-coordinate changes meaningfully, which matters for
 * the line-oriented regex parsers downstream.
 */
async function extractPageText(pdf: PDFDocumentProxy, pageNum: number): Promise<string> {
  const page = await pdf.getPage(pageNum);
  const content = await page.getTextContent();
  const out: string[] = [];
  let lastY: number | null = null;
  for (const raw of content.items) {
    if (!isTextItem(raw)) continue;
    const item = raw;
    const y = item.transform[5]; // y-coordinate
    if (lastY !== null && Math.abs(y - lastY) > 1) {
      out.push('\n');
    }
    out.push(item.str);
    if (item.hasEOL) out.push('\n');
    lastY = y;
  }
  return out.join('');
}

export async function extractPdfText(file: File): Promise<ExtractedPdf> {
  const pdfjs = await getPdfjs();
  const buffer = await readFile(file);
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    pages.push(await extractPageText(pdf, i));
  }

  await pdf.cleanup();
  await loadingTask.destroy();

  const fullText = pages.join('\n\n');
  return { pageCount: pdf.numPages, pages, fullText };
}
