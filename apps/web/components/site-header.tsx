import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

const NAV = [
  { href: '/onboarding/', label: 'Onboarding' },
  { href: '/documents/', label: 'Documents' },
  { href: '/dashboard/', label: 'Dashboard' },
  { href: '/plan/', label: 'Plan' },
  { href: '/privacy/', label: 'Privacy' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="font-medium tracking-tight">
            Retirement<span className="text-muted-foreground">Planning</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="https://github.com/venkatesanps/retirement-planning"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
