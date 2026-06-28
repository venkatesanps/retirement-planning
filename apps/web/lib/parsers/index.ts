/**
 * Public entry point: parseDocument(file) → ParsedDocument.
 *
 * Privacy invariant: every step runs in this tab. The PDF bytes never leave
 * the browser, and after parsing we discard the buffer.
 *
 * Failure policy: every error path produces a ParsedDocument with kind=unknown
 * and a populated `errors` array. The UI never has to handle a thrown error
 * from this module — the user always sees a card with a clear explanation.
 */

import { detectDocumentKind } from './detect';
import { extractPdfText, type ExtractOptions } from './pdf-extract';
import { parseSSAStatement } from './ssa';
import { parseForm1040 } from './form-1040';
import { parseAccountStatement } from './account-statement';
import { DOCUMENT_KIND_LABELS, type ParsedDocument } from './types';

export type { ParsedDocument, DocumentKind, ParsedField } from './types';
export { DOCUMENT_KIND_LABELS } from './types';
export { prefetchPdfjs } from './pdf-extract';

export type ParseOptions = ExtractOptions;

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function baseDoc(file: File): ParsedDocument {
  return {
    id: newId(),
    filename: file.name,
    sizeBytes: file.size,
    parsedAt: Date.now(),
    kind: 'unknown',
    kindLabel: DOCUMENT_KIND_LABELS.unknown,
    fields: [],
  };
}

export async function parseDocument(
  file: File,
  opts?: ParseOptions,
): Promise<ParsedDocument> {
  let fullText = '';
  let pageCount = 0;
  try {
    const r = await extractPdfText(file, opts);
    fullText = r.fullText;
    pageCount = r.pageCount;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ...baseDoc(file),
      errors: [
        `Couldn't read this PDF. It may be encrypted, an image-only scan with no text layer, or in a format pdf.js does not support. (${message})`,
      ],
    };
  }

  const detection = detectDocumentKind(fullText, file.name);
  const doc: ParsedDocument = {
    ...baseDoc(file),
    kind: detection.kind,
    kindLabel: DOCUMENT_KIND_LABELS[detection.kind],
    notes: pageCount > 1 ? [`Multi-page document (${pageCount} pages).`] : undefined,
  };

  try {
    if (detection.kind === 'ssa-statement') {
      const r = parseSSAStatement(fullText);
      doc.fields = r.fields;
      doc.errors = r.errors;
    } else if (detection.kind === 'form-1040') {
      const r = parseForm1040(fullText);
      doc.fields = r.fields;
      doc.errors = r.errors;
    } else if (detection.kind === '401k-statement' || detection.kind === 'brokerage-statement') {
      const r = parseAccountStatement(fullText, detection.kind);
      doc.fields = r.fields;
      doc.errors = r.errors;
      if (r.notes) doc.notes = [...(doc.notes ?? []), ...r.notes];
    } else {
      doc.errors = [
        fullText.trim().length === 0
          ? "We couldn't extract any text from this PDF (it may be a scanned image with no text layer). Try a 'searchable' or 'text-based' version of the document."
          : "Couldn't detect the document type. Supported: Social Security statement, Form 1040, 401(k)/403(b) statement, brokerage / IRA statement.",
      ];
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    doc.errors = [...(doc.errors ?? []), `Parser failed: ${message}`];
  }

  return doc;
}
