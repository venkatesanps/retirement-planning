/**
 * Public entry point: parseDocument(file) → ParsedDocument.
 *
 * Privacy invariant: every step runs in this tab. The PDF bytes never leave
 * the browser, and after parsing we discard the buffer.
 */

import { detectDocumentKind } from './detect';
import { extractPdfText } from './pdf-extract';
import { parseSSAStatement } from './ssa';
import { parseForm1040 } from './form-1040';
import { parseAccountStatement } from './account-statement';
import { DOCUMENT_KIND_LABELS, type ParsedDocument } from './types';

export type { ParsedDocument, DocumentKind, ParsedField } from './types';
export { DOCUMENT_KIND_LABELS } from './types';

export async function parseDocument(file: File): Promise<ParsedDocument> {
  const { fullText, pageCount } = await extractPdfText(file);
  const detection = detectDocumentKind(fullText, file.name);
  const id = (globalThis.crypto?.randomUUID?.() ?? `doc-${Date.now()}`);

  const base: ParsedDocument = {
    id,
    filename: file.name,
    sizeBytes: file.size,
    parsedAt: Date.now(),
    kind: detection.kind,
    kindLabel: DOCUMENT_KIND_LABELS[detection.kind],
    fields: [],
    notes: pageCount > 1 ? [`Multi-page document (${pageCount} pages).`] : undefined,
  };

  if (detection.kind === 'ssa-statement') {
    const r = parseSSAStatement(fullText);
    base.fields = r.fields;
    base.errors = r.errors;
  } else if (detection.kind === 'form-1040') {
    const r = parseForm1040(fullText);
    base.fields = r.fields;
    base.errors = r.errors;
  } else if (detection.kind === '401k-statement' || detection.kind === 'brokerage-statement') {
    const r = parseAccountStatement(fullText, detection.kind);
    base.fields = r.fields;
    base.errors = r.errors;
    if (r.notes) base.notes = [...(base.notes ?? []), ...r.notes];
  } else {
    base.errors = [
      "Couldn't detect the document type. Supported: Social Security statement, Form 1040, 401(k)/403(b) statement, brokerage / IRA statement.",
    ];
  }

  return base;
}
