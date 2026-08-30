import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/lib/marketing";

export const metadata: Metadata = {
  title: `About | ${PRODUCT_NAME}`,
  description: `Why we built ${PRODUCT_NAME} — a calmer ATS for teams that care about candidates.`,
};

const AboutPage = () => {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
      <p className="text-sm font-semibold text-violet-600 mb-2">About</p>
      <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
        Hiring tools should feel calm, not chaotic
      </h1>
      <div className="mt-8 space-y-5 text-zinc-600 leading-relaxed">
        <p>
          {PRODUCT_NAME} started from a simple observation: most ATS products
          are either too rigid for growing companies or too shallow for teams
          that need real collaboration.
        </p>
        <p>
          We built a multi-tenant platform where organizations get branded
          career pages, structured pipelines, AI-assisted screening, and
          communication tools — without forcing every company into the same
          enterprise template.
        </p>
        <p>
          Whether you are a two-person recruiting team or a multi-department
          org, the goal is the same: move the right people forward, keep
          everyone in the loop, and treat candidates with respect.
        </p>
      </div>

      <div className="mt-12 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8">
        <h2 className="font-semibold text-zinc-900">What we optimize for</h2>
        <ul className="mt-4 space-y-2 text-sm text-zinc-600">
          <li>• Speed from post → shortlist without sacrificing quality</li>
          <li>• Clear ownership across recruiters and hiring managers</li>
          <li>• Candidate experience on every career subdomain</li>
          <li>• Extensibility via plugins (email, calendar, scoring)</li>
        </ul>
      </div>

      <div className="mt-10 flex gap-3">
        <Button asChild className="rounded-xl">
          <Link href="/sign-up">Try {PRODUCT_NAME}</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/contact">Contact us</Link>
        </Button>
      </div>
    </div>
  );
};

export default AboutPage;
