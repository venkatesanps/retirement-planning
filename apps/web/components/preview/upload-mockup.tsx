import { Upload, FileText, CheckCircle2, ShieldCheck, Lock, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const EXTRACTED = [
  {
    file: 'SSA-statement-2026.pdf',
    docType: 'Social Security statement',
    fields: [
      { label: 'PIA at age 62', value: '$2,180/mo' },
      { label: 'PIA at FRA (67)', value: '$3,100/mo' },
      { label: 'PIA at age 70', value: '$3,840/mo' },
    ],
  },
  {
    file: 'fidelity-401k-q4-2025.pdf',
    docType: '401(k) statement',
    fields: [
      { label: 'Balance', value: formatCurrency(720000) },
      { label: 'YTD contribution', value: formatCurrency(23000) },
      { label: 'Employer match (YTD)', value: formatCurrency(10500) },
    ],
  },
  {
    file: 'form-1040-2024.pdf',
    docType: 'Form 1040',
    fields: [
      { label: 'AGI', value: formatCurrency(218000) },
      { label: 'Filing status', value: 'MFJ' },
      { label: 'Qualified dividends', value: formatCurrency(4200) },
    ],
  },
];

export function UploadMockup() {
  return (
    <div className="bg-muted/30 p-6 md:p-10 grid gap-6 lg:grid-cols-[1fr,1.2fr]">
      {/* Dropzone */}
      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-dashed border-border bg-card hover:border-primary/50 transition p-8 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Upload className="h-5 w-5" />
          </div>
          <div className="mt-4 font-medium">Drop a PDF here</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Or <span className="text-primary underline">browse</span>. We accept Social Security
            statements, 1040s, 401(k), IRA, and brokerage statements.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-primary" /> Privacy check
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <Check label="Network requests this session" value="0 third-party" />
            <Check label="File reaches a server" value="No" />
            <Check label="Storage" value="IndexedDB on this device" />
            <Check label="Encryption" value="AES-GCM 256 (passphrase set)" />
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 text-muted-foreground inline -mt-0.5 mr-1.5" />
          The PDF is parsed in a Web Worker by pdf.js. The file is{' '}
          <span className="font-medium text-foreground">discarded</span> after we extract values
          unless you opt in to keep an encrypted copy.
        </div>
      </div>

      {/* Extracted values */}
      <div className="space-y-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Recently parsed — please confirm before saving
        </div>

        {EXTRACTED.map((e) => (
          <div key={e.file} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </span>
                <div>
                  <div className="font-medium text-sm">{e.file}</div>
                  <div className="text-xs text-muted-foreground">Detected: {e.docType}</div>
                </div>
              </div>
              <button
                className="text-xs text-muted-foreground hover:text-danger inline-flex items-center gap-1"
                aria-label={`Delete ${e.file}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <dl className="px-5 py-4 grid grid-cols-3 gap-4">
              {e.fields.map((f) => (
                <div key={f.label}>
                  <dt className="text-xs text-muted-foreground">{f.label}</dt>
                  <dd className="mt-1 text-sm font-medium numeral">{f.value}</dd>
                </div>
              ))}
            </dl>
            <div className="px-5 py-3 bg-muted/40 border-t border-border/60 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Looks right? These values will replace the ones currently saved.
              </span>
              <div className="flex gap-2">
                <button className="rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted">
                  Edit
                </button>
                <button className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90">
                  <CheckCircle2 className="h-3 w-3" /> Confirm & save
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
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
