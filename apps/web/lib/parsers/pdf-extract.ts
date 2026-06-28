/**
 * Client-side PDF text extraction using pdf.js.
 *
 * The PDF is read from a File via FileReader (no fetch, no server, no upload),
 * then pdf.js extracts text per page in a Web Worker. We return one string per
 * page so downstream parsers can stay simple.
 *
 * Privacy invariant: this module never makes a network request with the PDF
 * contents. The pdf.js worker is loaded from this site's own origin (same
 * origin policy + strict CSP would block anything else).
 */

import type { PDFDocumentProxy, TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';

export interface ExtractedPdf {
  pageCount: number;
  pages: string[];
  fullText: string;
}

type PdfJsModule = typeof import('pdfjs-dist');

let pdfjsPromise: Promise<PdfJsModule> | null = null;
let workerWarm = false;

async function loadPdfjs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const raw = await import('pdfjs-dist');
      const mod = ((raw as { default?: PdfJsModule }).default ?? raw) as PdfJsModule;
      if (typeof mod.getDocument !== 'function') {
        throw new Error('pdf.js getDocument is unavailable.');
      }
      mod.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
      return mod;
    })();
  }
  return pdfjsPromise;
}

/**
 * Pre-warm the pdf.js library AND the worker, so the first real upload is
 * near-instant. Safe to call multiple times. Call on documents-page mount.
 */
export async function prefetchPdfjs(): Promise<void> {
  if (workerWarm) return;
  const pdfjs = await loadPdfjs();
  // Force the worker bundle to download by spinning up an empty parse.
  // A minimal valid empty PDF.
  const empty = new Uint8Array([
    0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, // %PDF-1.4
    0x25, 0xc7, 0xec, 0x8f, 0xa2, 0x0a, // binary marker
  ]);
  try {
    const task = pdfjs.getDocument({ data: empty, verbosity: 0 });
    // Don't await the document promise — it'll reject for this stub, but the
    // act of submitting causes the worker to be initialized.
    void task.promise.catch(() => undefined);
    // Give the worker fetch a tick to start
    await new Promise((r) => setTimeout(r, 0));
    await task.destroy().catch(() => undefined);
  } catch {
    // ignore — the goal was only to trigger the worker download
  }
  workerWarm = true;
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
 * Read a single page's text. Defensive against pages without a text layer
 * (scanned images, XFA forms, missing fonts).
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

export interface ExtractOptions {
  /** Called with a 0..1 progress fraction during page extraction. */
  onProgress?: (fraction: number, phase: 'loading' | 'parsing') => void;
}

async function extractWithOptions(
  file: File,
  enableXfa: boolean,
  opts: ExtractOptions | undefined,
): Promise<ExtractedPdf> {
  opts?.onProgress?.(0, 'loading');
  const pdfjs = await loadPdfjs();
  const buffer = await readFile(file);
  opts?.onProgress?.(0.1, 'parsing');

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    enableXfa,
    verbosity: 0,
  });

  let pdf: PDFDocumentProxy | undefined;
  try {
    pdf = await loadingTask.promise;
    workerWarm = true;
    const n = pdf.numPages;
    // Process pages in parallel; for most statements (1–10 pages) this is a
    // big win over the previous serial loop. The pdf.js worker can interleave
    // these on its own thread.
    let done = 0;
    const pages = await Promise.all(
      Array.from({ length: n }, (_, i) =>
        extractPageText(pdf!, i + 1).then((text) => {
          done += 1;
          opts?.onProgress?.(0.1 + (done / n) * 0.9, 'parsing');
          return text;
        }),
      ),
    );
    const fullText = pages.join('\n\n');
    return { pageCount: n, pages, fullText };
  } finally {
    if (pdf) void pdf.cleanup().catch(() => undefined);
    void loadingTask.destroy().catch(() => undefined);
  }
}

export async function extractPdfText(
  file: File,
  opts?: ExtractOptions,
): Promise<ExtractedPdf> {
  // First attempt without XFA (fast path — covers >99% of statements).
  const fast = await extractWithOptions(file, false, opts);
  if (fast.fullText.trim().length > 0) return fast;
  // If we got nothing, retry with XFA enabled for the rare XFA-form PDF.
  return extractWithOptions(file, true, opts);
}
