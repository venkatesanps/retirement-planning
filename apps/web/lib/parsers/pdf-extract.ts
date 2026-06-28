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

type PdfJsModule = typeof import('pdfjs-dist');

let pdfjsModule: PdfJsModule | null = null;

async function getPdfjs(): Promise<PdfJsModule> {
  if (pdfjsModule) return pdfjsModule;
  const raw = await import('pdfjs-dist');
  // Some bundler interop paths wrap ESM under .default — handle both shapes.
  const mod = ((raw as { default?: PdfJsModule }).default ?? raw) as PdfJsModule;
  if (typeof mod.getDocument !== 'function') {
    throw new Error(
      'pdf.js getDocument is unavailable. The bundler may have shipped a stub instead of the real module.',
    );
  }
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
 * Read a single page's text. Defensive against the various ways pdf.js can
 * return "no usable text layer" (scanned images, XFA forms, missing fonts):
 * any of those produce content with empty or missing `items`, and we treat
 * that as "page contributed no text" rather than crashing.
 */
async function extractPageText(pdf: PDFDocumentProxy, pageNum: number): Promise<string> {
  const page = await pdf.getPage(pageNum);
  let content;
  try {
    content = await page.getTextContent();
  } catch {
    return '';
  }
  const items = content?.items;
  if (!items || !Array.isArray(items) || items.length === 0) return '';

  const out: string[] = [];
  let lastY: number | null = null;
  for (const raw of items) {
    if (!isTextItem(raw)) continue;
    const item = raw;
    const y = item.transform?.[5];
    if (typeof y === 'number' && lastY !== null && Math.abs(y - lastY) > 1) {
      out.push('\n');
    }
    out.push(item.str ?? '');
    if (item.hasEOL) out.push('\n');
    if (typeof y === 'number') lastY = y;
  }
  return out.join('');
}

export async function extractPdfText(file: File): Promise<ExtractedPdf> {
  const pdfjs = await getPdfjs();
  const buffer = await readFile(file);
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    // XFA forms (e.g., some payroll PDFs) need this to surface text.
    enableXfa: true,
    // Silence the console "verbosity" output unless something is really wrong.
    verbosity: 0,
  });

  let pdf: PDFDocumentProxy | undefined;
  try {
    pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      pages.push(await extractPageText(pdf, i));
    }
    const fullText = pages.join('\n\n');
    return { pageCount: pdf.numPages, pages, fullText };
  } finally {
    if (pdf) await pdf.cleanup().catch(() => undefined);
    await loadingTask.destroy().catch(() => undefined);
  }
}
