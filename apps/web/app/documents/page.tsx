'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  prefetchPdfjs,
  type ParsedDocument,
  type ParsedField,
} from '@/lib/parsers';
import { useHydrateStore, useStore } from '@/lib/store';
import { Button } from '@/components/ui/field';

interface ParsingJob {
  name: string;
  phase: 'queued' | 'loading' | 'parsing';
  fraction: number;
}

export default function DocumentsPage() {
  useHydrateStore();
  const documents = useStore((s) => s.documents);
  const addDocument = useStore((s) => s.addDocument);
  const removeDocument = useStore((s) => s.removeDocument);
  const household = useStore((s) => s.household);
  const patchHousehold = useStore((s) => s.patchHousehold);

  const [jobs, setJobs] = useState<ParsingJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // Start in 'preloading' on the client; on the server we render 'idle' and
  // immediately swap on hydration via the effect below.
  const [engineState, setEngineState] = useState<'idle' | 'preloading' | 'ready'>('preloading');
  const fileInput = useRef<HTMLInputElement>(null);

  // Kick off the pdf.js + worker download as soon as the page mounts so the
  // first upload doesn't pay the 366KB worker fetch cost.
  useEffect(() => {
    let cancelled = false;
    prefetchPdfjs()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setEngineState('ready');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
      );
      if (list.length === 0) {
        setError('Only PDF files are supported.');
        return;
      }
      setError(null);

      // Seed jobs as queued so the user sees them immediately
      setJobs((prev) => [
        ...prev,
        ...list.map((f) => ({ name: f.name, phase: 'queued' as const, fraction: 0 })),
      ]);

      for (const file of list) {
        const updateJob = (patch: Partial<ParsingJob>) => {
          setJobs((prev) =>
            prev.map((j) => (j.name === file.name ? { ...j, ...patch } : j)),
          );
        };
        try {
          const parsed = await parseDocument(file, {
            onProgress: (fraction, phase) => updateJob({ phase, fraction }),
          });
          addDocument(parsed);
        } catch (err) {
          setError(`Failed to read ${file.name}: ${err instanceof Error ? err.message : 'unknown error'}`);
        } finally {
          setJobs((prev) => prev.filter((j) => j.name !== file.name));
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

        <EngineStatus state={engineState} />

        {error ? (
          <div className="rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        {jobs.length > 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-sm font-medium flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Parsing…
            </div>
            <ul className="mt-3 space-y-2">
              {jobs.map((j) => (
                <li key={j.name} className="text-xs">
                  <div className="flex justify-between gap-2 mb-1">
                    <span className="truncate text-muted-foreground">{j.name}</span>
                    <span className="text-muted-foreground numeral shrink-0">
                      {phaseLabel(j.phase, j.fraction)}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-150"
                      style={{ width: `${Math.max(5, Math.round(j.fraction * 100))}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <PrivacyPanel />
        <SupportedDocs />
      </div>

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

function phaseLabel(phase: ParsingJob['phase'], fraction: number): string {
  if (phase === 'queued') return 'queued';
  if (phase === 'loading') return 'loading engine…';
  return `${Math.round(fraction * 100)}%`;
}

function EngineStatus({ state }: { state: 'idle' | 'preloading' | 'ready' }) {
  if (state === 'ready') {
    return (
      <div className="flex items-center gap-2 text-xs text-success">
        <CheckCircle2 className="h-3.5 w-3.5" /> PDF engine ready
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading PDF engine (~370 KB)…
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

      {doc.debugText ? <DebugSnippet text={doc.debugText} /> : null}
    </div>
  );
}

function DebugSnippet({ text }: { text: string }) {
  return (
    <details className="border-t border-border/60 group">
      <summary className="cursor-pointer list-none px-5 py-3 text-xs text-muted-foreground hover:text-foreground select-none flex items-center justify-between">
        <span>Show extracted text (for debugging / manual lookup)</span>
        <span className="text-[10px] uppercase tracking-wider group-open:hidden">show</span>
        <span className="text-[10px] uppercase tracking-wider hidden group-open:inline">hide</span>
      </summary>
      <pre className="px-5 pb-4 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap max-h-72 overflow-y-auto font-mono">
        {text}
      </pre>
    </details>
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
 */
function applyExtractedFieldsToHousehold(
  h: NonNullable<ReturnType<typeof useStore.getState>['household']>,
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
          ss[ssIndex] = { ...target, piaMonthly: newPia / 1.24 };
        } else if (field.label.includes('age 62')) {
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
  }

  return next;
}
