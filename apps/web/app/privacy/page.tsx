import type { Metadata } from 'next';
import {
  WifiOff,
  Lock,
  Eye,
  ShieldCheck,
  HardDrive,
  Code2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy promise',
  description:
    'How this retirement planner keeps your financial data on your device. Technical details of the privacy architecture.',
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <div className="text-xs uppercase tracking-wider text-primary font-medium">
          The privacy promise
        </div>
        <h1 className="mt-3 text-5xl tracking-tight font-medium">
          Your data never leaves this browser tab.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          Most financial tools want your Social Security earnings, 401(k) balances, tax returns,
          and even bank logins on their servers. We took a different bet: build everything so it
          runs entirely in your browser, and prove it&apos;s true by making the source code open.
        </p>
      </header>

      <section className="space-y-10">
        {SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-2xl border border-border bg-card p-6 md:p-8"
          >
            <div className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <section.icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-2xl tracking-tight font-medium">{section.title}</h2>
                <div className="mt-3 space-y-3 text-muted-foreground leading-relaxed">
                  {section.body.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                {section.code ? (
                  <pre className="mt-4 rounded-lg bg-muted/60 px-4 py-3 text-xs overflow-x-auto">
                    <code>{section.code}</code>
                  </pre>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-16 rounded-2xl border border-warn/40 bg-warn/5 p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-5 w-5 text-warn shrink-0 mt-1" />
          <div>
            <h2 className="font-medium">What we don&apos;t protect against</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Anyone with physical access to your unlocked device can open this browser and read
              your data. If you share the computer, set a strong passphrase in Settings, enable
              auto-lock, and use the panic-wipe button before stepping away. A compromised
              browser extension can read this page&apos;s storage — review your installed
              extensions periodically.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12 text-center">
        <p className="text-muted-foreground">
          Don&apos;t take our word for it.{' '}
          <a
            href="https://github.com/venkatesanps/retirement-planning"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            Read the source on GitHub →
          </a>
        </p>
      </section>
    </article>
  );
}

const SECTIONS = [
  {
    icon: WifiOff,
    title: 'Documents never upload',
    body: [
      'When you drop a PDF onto the upload area, the file stays on your device. A Web Worker runs pdf.js to extract text, then a small parser pulls out the numbers you confirm before anything is saved.',
      'You can verify this with your browser’s DevTools. Open the Network tab, upload a statement, and watch: zero outbound requests.',
    ],
  },
  {
    icon: HardDrive,
    title: 'Storage is your browser’s IndexedDB',
    body: [
      'Your profile, accounts, and parsed numbers live in this site’s IndexedDB — the same place modern web apps store offline data. Each origin gets its own sandboxed store; no other site can read ours.',
      'If you set a passphrase in Settings, we encrypt every record with AES-GCM 256 using a key derived from your passphrase via PBKDF2 (600,000 iterations). The key is held only in memory and never written to disk.',
    ],
  },
  {
    icon: Eye,
    title: 'No analytics, no third-party requests',
    body: [
      'No Google Analytics. No Sentry. No fonts loaded from a CDN. No Plaid or similar account-linking. The app bundles its own fonts and charts so the network tab stays clean.',
      'We enforce this with a strict Content Security Policy:',
    ],
    code: `default-src 'self';
img-src 'self' data:;
style-src 'self' 'unsafe-inline';
script-src 'self';
connect-src 'self';
frame-ancestors 'none';`,
  },
  {
    icon: Lock,
    title: 'Optional encryption with a passphrase',
    body: [
      'You can use the planner without a passphrase — your data still stays on your device, but anyone with access to the browser can read it.',
      'Set a passphrase and we derive a key (Web Crypto, PBKDF2 → AES-GCM) that encrypts every IndexedDB record. The key lives only in memory and is wiped on tab close or auto-lock.',
    ],
  },
  {
    icon: Trash2,
    title: 'A panic button that actually clears everything',
    body: [
      'Settings → Wipe all data clears IndexedDB, Cache Storage, and any service worker registration in one action. Then reload the tab and there’s nothing left.',
    ],
  },
  {
    icon: Code2,
    title: 'Open source you can audit and self-host',
    body: [
      'The full source is on GitHub under the MIT license. CI publishes a reproducible build hash so you can verify the deployed JavaScript matches the audited source. If you don’t trust GitHub Pages either, clone the repo and run it offline — it’s a static site.',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'No account, no signup, no email',
    body: [
      'There is nothing to register for. Bookmark the page and your data is there when you return. If you clear your browser data, it’s gone for good — export an encrypted backup from Settings if you want a copy.',
    ],
  },
];
