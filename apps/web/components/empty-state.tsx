import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export function NoHouseholdYet() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </div>
      <h1 className="mt-6 text-3xl tracking-tight font-medium">
        No plan yet
      </h1>
      <p className="mt-3 text-muted-foreground">
        Walk through the 2-minute onboarding to get a personalized projection. Your numbers
        stay in this browser.
      </p>
      <Link
        href="/onboarding/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 text-sm font-medium shadow-sm hover:opacity-90 transition"
      >
        Start onboarding <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
