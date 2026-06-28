'use client';

import { useCallback, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Lock,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import {
  parseDocument,
  type ParsedDocument,
  type ParsedField,
} from '@/lib/parsers';
import { useHydrateStore, useStore } from '@/lib/store';
import { Button } from '@/components/ui/field';

export default function DocumentsPage() {
  useHydrateStore();
  const documents = useStore((s) => s.documents);
  const addDocument = useStore((s) => s.addDocument);
  const removeDocument = useStore((s) => s.removeDocument);
  const household = useStore((s) => s.household);
  const patchHousehold = useStore((s) => s.patchHousehold);

  const [parsing, setParsing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      if (list.length === 0) {
        setError('Only PDF files are supported.');
        return;
      }
      setError(null);
      for (const file of list) {
        setParsing((p) => [...p, file.name]);
        try {
          const parsed = await parseDocument(file);
          addDocument(parsed);
        } catch (err) {
          setError(`Failed to read ${file.name}: ${err instanceof Error ? err.message : 'unknown error'}`);
        } finally {
          setParsing((p) => p.filter((n) => n !== file.name));
        }
      }
    },
    [addDocument],
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 grid gap-6 lg:grid-cols-[1fr,1.2fr]">
      <header className="lg:col-span-2 mb-2">
        <div className="text-xs uppercase tracking-wider text-primary font-medium">
          Documents
        </div>
        <h1 className="mt-3 text-4xl tracking-tight font-medium">
          Upload your statements.
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          PDFs are read on this device by pdf.js. The file is{' '}
          <span className="font-medium text-foreground">never uploaded</span> and is
          discarded immediately after we extract the numbers.
        </p>
      </header>

      {/* Left: dropzone + privacy panel */}
      <div className="space-y-4">
        <Dropzone
          onFiles={handleFiles}
          onBrowse={() => fileInput.current?.click()}
          dragging={dragging}
          setDragging={setDragging}
        />
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        {error ? (
          <div className="rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        {parsing.length > 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm">
            <div className="font-medium flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Parsing…
            </div>
            <ul className="mt-2 text-muted-foreground space-y-1 text-xs">
              {parsing.map((n) => (
                <li key={n} className="truncate">{n}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <PrivacyPanel />
        <SupportedDocs />
      </div>

      {/* Right: parsed cards */}
      <div className="space-y-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Recently parsed — confirm before applying
        </div>
        {documents.length === 0 ? (
          <EmptyDocs />
        ) : (
          documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onDelete={() => removeDocument(doc.id)}
              canApply={!!household}
              onApply={(updates) => {
                if (!household) return;
                patchHousehold((h) => applyExtractedFieldsToHousehold(h, doc, updates));
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function Dropzone({
  onFiles,
  onBrowse,
  dragging,
  setDragging,
}: {
  onFiles: (files: FileList | File[]) => void;
  onBrowse: () => void;
  dragging: boolean;
  setDragging: (b: boolean) => void;
}) {
  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
        dragging ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'
      }`}
    >
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Upload className="h-5 w-5" />
      </div>
      <div className="mt-4 font-medium">Drop a PDF here</div>
      <p className="mt-1 text-sm text-muted-foreground">
        or{' '}
        <button
          type="button"
          onClick={onBrowse}
          className="text-primary underline-offset-2 hover:underline"
        >
          browse
        </button>
        . Multiple files OK.
      </p>
    </div>
  );
}

function PrivacyPanel() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldCheck className="h-4 w-4 text-primary" /> Privacy
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        <Check label="File leaves device" value="No" />
        <Check label="PDF stored after parsing" value="No — discarded" />
        <Check label="Parsing runs in" value="pdf.js Web Worker" />
        <Check label="Network requests with file" value="0" />
      </ul>
    </div>
  );
}

function SupportedDocs() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
      <Lock className="h-4 w-4 inline -mt-0.5 mr-1.5" />
      We parse: Social Security statement (ssa.gov), Form 1040, 401(k)/403(b) statement,
      brokerage/IRA statement. Anything else: nothing breaks — we just won&apos;t know
      what to do with it.
    </div>
  );
}

function Check({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-success font-medium text-right">{value}</span>
    </li>
  );
}

function EmptyDocs() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
      <FileText className="h-6 w-6 text-muted-foreground mx-auto" />
      <p className="mt-3 text-sm text-muted-foreground">
        No documents parsed yet. Drop a PDF on the left to start.
      </p>
    </div>
  );
}

function DocumentCard({
  doc,
  onDelete,
  canApply,
  onApply,
}: {
  doc: ParsedDocument;
  onDelete: () => void;
  canApply: boolean;
  onApply: (selected: Set<string>) => void;
}) {
  // Pre-select all numeric fields. Parent uses key={doc.id} so this initializer
  // re-runs whenever a different doc is rendered.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(doc.fields.filter((f) => f.numeric !== undefined).map((f) => f.label)),
  );

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{doc.filename}</div>
            <div className="text-xs text-muted-foreground">
              Detected: {doc.kindLabel} · {(doc.sizeBytes / 1024).toFixed(0)} KB
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-muted-foreground hover:text-danger p-2 shrink-0"
          aria-label={`Delete ${doc.filename}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {doc.errors && doc.errors.length > 0 ? (
        <div className="px-5 py-3 bg-warn/5 border-b border-warn/30 text-xs text-warn flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="space-y-1">
            {doc.errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        </div>
      ) : null}
      {doc.notes && doc.notes.length > 0 ? (
        <div className="px-5 py-2 bg-muted/60 border-b border-border/60 text-xs text-muted-foreground">
          {doc.notes.join(' · ')}
        </div>
      ) : null}

      {doc.fields.length === 0 ? (
        <div className="px-5 py-6 text-sm text-muted-foreground">
          No structured fields extracted. Try a different PDF or enter values manually in{' '}
          <a href="/onboarding/" className="text-primary underline-offset-2 hover:underline">
            Onboarding
          </a>
          .
        </div>
      ) : (
        <ul className="divide-y divide-border/50">
          {doc.fields.map((f) => (
            <FieldRow
              key={f.label}
              field={f}
              checked={selected.has(f.label)}
              onToggle={() => {
                setSelected((cur) => {
                  const next = new Set(cur);
                  if (next.has(f.label)) next.delete(f.label);
                  else next.add(f.label);
                  return next;
                });
              }}
            />
          ))}
        </ul>
      )}

      {doc.fields.some((f) => f.numeric !== undefined) ? (
        <div className="px-5 py-3 bg-muted/40 border-t border-border/60 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {canApply
              ? 'Apply selected values to your household plan?'
              : 'Complete onboarding first to apply these to your plan.'}
          </span>
          <Button
            size="sm"
            disabled={!canApply || selected.size === 0}
            onClick={() => onApply(selected)}
          >
            <Wand2 className="h-3.5 w-3.5" /> Apply to plan
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FieldRow({
  field,
  checked,
  onToggle,
}: {
  field: ParsedField;
  checked: boolean;
  onToggle: () => void;
}) {
  const canApply = field.numeric !== undefined;
  return (
    <li className="px-5 py-3 flex items-center gap-3">
      {canApply ? (
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
        />
      ) : (
        <span className="w-4" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{field.label}</div>
        <div className="text-sm font-medium numeral">{field.value}</div>
      </div>
      <ConfidenceBadge value={field.confidence} />
    </li>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  if (value >= 0.75) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success text-[10px] font-medium px-2 py-0.5">
        <CheckCircle2 className="h-3 w-3" /> High
      </span>
    );
  }
  if (value >= 0.5) {
    return (
      <span className="inline-flex rounded-full bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5">
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warn/10 text-warn text-[10px] font-medium px-2 py-0.5">
      <AlertTriangle className="h-3 w-3" /> Low
    </span>
  );
}

/**
 * Translate selected parsed fields into household mutations.
 *
 * - SSA fields update the matching SocialSecurity entry (self assumed unless
 *   already split; this is best-effort for v1).
 * - 1040 fields update spend assumptions and filing status.
 * - Account-statement fields update the first matching account by kind.
 */
function applyExtractedFieldsToHousehold(
  h: Parameters<typeof import('@/lib/store').useStore.setState>[0] extends never
    ? never
    : NonNullable<ReturnType<typeof useStore.getState>['household']>,
  doc: ParsedDocument,
  selected: Set<string>,
): NonNullable<ReturnType<typeof useStore.getState>['household']> {
  let next = h;

  for (const field of doc.fields) {
    if (!selected.has(field.label) || field.numeric === undefined) continue;

    if (doc.kind === 'ssa-statement') {
      const newPia = field.numeric;
      const ssIndex = next.socialSecurity.findIndex((s) => s.owner === 'self');
      if (ssIndex >= 0) {
        const ss = [...next.socialSecurity];
        const target = ss[ssIndex]!;
        if (field.label.includes('full retirement age')) {
          ss[ssIndex] = { ...target, piaMonthly: newPia };
        } else if (field.label.includes('age 70')) {
          // Convert to PIA by dividing by 1.24 (approx. delayed credit @ FRA 67)
          ss[ssIndex] = { ...target, piaMonthly: newPia / 1.24 };
        } else if (field.label.includes('age 62')) {
          // Convert to PIA by dividing by 0.7 (approx. reduction)
          ss[ssIndex] = { ...target, piaMonthly: newPia / 0.7 };
        }
        next = { ...next, socialSecurity: ss };
      }
    } else if (doc.kind === '401k-statement') {
      const accountIndex = next.accounts.findIndex((a) => a.kind === '401k' || a.kind === '403b');
      if (accountIndex >= 0) {
        const accounts = [...next.accounts];
        const target = accounts[accountIndex]!;
        if (field.label === 'Account balance') {
          accounts[accountIndex] = { ...target, balance: field.numeric };
        } else if (field.label === 'YTD contribution') {
          accounts[accountIndex] = { ...target, annualContribution: field.numeric };
        } else if (field.label === 'Employer match (YTD)') {
          accounts[accountIndex] = { ...target, employerMatch: field.numeric };
        }
        next = { ...next, accounts };
      }
    } else if (doc.kind === 'brokerage-statement') {
      const accountIndex = next.accounts.findIndex(
        (a) => a.kind === 'taxableBrokerage' || a.kind === 'tradIRA' || a.kind === 'rothIRA',
      );
      if (accountIndex >= 0) {
        const accounts = [...next.accounts];
        const target = accounts[accountIndex]!;
        if (field.label.startsWith('Account balance')) {
          accounts[accountIndex] = { ...target, balance: field.numeric };
        } else if (field.label === 'Total cost basis') {
          accounts[accountIndex] = { ...target, costBasis: field.numeric };
        }
        next = { ...next, accounts };
      }
    }
    // Form 1040 fields are informational for now; full integration into the
    // engine's tax pass arrives in Phase 4.
  }

  return next;
}
