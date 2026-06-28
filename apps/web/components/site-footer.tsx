import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="mx-auto max-w-6xl px-6 py-10 grid gap-6 md:grid-cols-3 text-sm">
        <div className="space-y-2">
          <div className="font-medium">Retirement Planning</div>
          <p className="text-muted-foreground">
            Open-source, privacy-first retirement projection. Runs entirely in your browser.
          </p>
        </div>
        <div className="space-y-2">
          <div className="font-medium">Project</div>
          <ul className="space-y-1 text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/preview">Design preview</Link></li>
            <li><Link className="hover:text-foreground" href="/privacy">Privacy promise</Link></li>
            <li>
              <a
                className="hover:text-foreground"
                href="https://github.com/venkatesanps/retirement-planning"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source on GitHub
              </a>
            </li>
          </ul>
        </div>
        <div className="space-y-2">
          <div className="font-medium">Disclaimer</div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Educational tool only. Not financial, tax, or legal advice. U.S. tax assumptions.
            Consult a qualified professional before making decisions.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-4 border-t border-border/60 text-xs text-muted-foreground flex justify-between">
        <span>© 2026 · MIT licensed</span>
        <span>v0.1.0</span>
      </div>
    </footer>
  );
}
