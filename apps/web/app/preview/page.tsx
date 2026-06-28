import type { Metadata } from 'next';
import { DashboardMockup } from '@/components/preview/dashboard-mockup';
import { PlanTableMockup } from '@/components/preview/plan-table-mockup';
import { UploadMockup } from '@/components/preview/upload-mockup';

export const metadata: Metadata = {
  title: 'Design preview',
  description: 'Static visual mockups of the retirement planner UI.',
};

export default function PreviewPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 space-y-20">
      <header className="max-w-3xl">
        <div className="text-xs uppercase tracking-wider text-primary font-medium">
          Design preview
        </div>
        <h1 className="mt-3 text-5xl tracking-tight font-medium">
          What the planner will look like.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          These are static mockups — no real calculation yet. They&apos;re here so we can lock
          in the aesthetic before the engine is built. Three screens: the dashboard summary, the
          year-by-year plan, and the privacy-first document upload flow.
        </p>
      </header>

      <PreviewSection
        eyebrow="01 — Dashboard"
        title="The summary you see every time you open the planner"
        description="Hero numerals communicate the answer in one glance. Supporting metrics live below. No chart-junk."
      >
        <DashboardMockup />
      </PreviewSection>

      <PreviewSection
        eyebrow="02 — Plan"
        title="A real year-by-year cash flow"
        description="Dense, scannable table with running balances, withdrawals from each bucket, taxes, and RMDs. Chart on top for shape."
      >
        <PlanTableMockup />
      </PreviewSection>

      <PreviewSection
        eyebrow="03 — Documents"
        title="Privacy-first document upload"
        description="Drop a PDF, see what was extracted, confirm before saving. A live counter shows zero third-party network requests."
      >
        <UploadMockup />
      </PreviewSection>
    </div>
  );
}

function PreviewSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-wider text-primary font-medium">{eyebrow}</div>
        <h2 className="mt-2 text-3xl tracking-tight font-medium">{title}</h2>
        <p className="mt-2 text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
        {children}
      </div>
    </section>
  );
}
