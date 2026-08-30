import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Mail,
  Plug,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/lib/marketing";

const FEATURES = [
  {
    icon: Workflow,
    title: "Visual pipelines",
    description:
      "Drag candidates through custom stages. Kanban boards that match how your team actually hires.",
  },
  {
    icon: Sparkles,
    title: "AI resume scoring",
    description:
      "Score fit, skills, and experience automatically so recruiters spend time on the right people.",
  },
  {
    icon: Mail,
    title: "Communication hub",
    description:
      "Templates, inbox, and automations — confirmations, interview invites, and stage updates.",
  },
  {
    icon: Plug,
    title: "Plugin ecosystem",
    description:
      "Connect Resend, calendars, and more. Toggle integrations per org without engineering tickets.",
  },
  {
    icon: Users,
    title: "Team collaboration",
    description:
      "Internal notes, mentions, scorecards, and role-based access for recruiters and hiring managers.",
  },
  {
    icon: BarChart3,
    title: "Hiring analytics",
    description:
      "Time-to-hire, funnel conversion, and source effectiveness in one place.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Create your workspace",
    text: "Spin up an organization, invite your team, and set branding for your career page.",
  },
  {
    step: "02",
    title: "Publish jobs & pipelines",
    text: "Define stages, automations, and requirements. Share a branded careers subdomain.",
  },
  {
    step: "03",
    title: "Hire with clarity",
    text: "Review applications, collaborate in-thread, and move candidates from apply to offer.",
  },
];

const HomePage = () => {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-50 via-white to-white" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm mb-6">
              <Sparkles className="size-3.5 text-violet-600" />
              Applicant tracking built for modern teams
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 leading-[1.1]">
              Hire faster without losing the human touch
            </h1>
            <p className="mt-6 text-lg text-zinc-600 leading-relaxed max-w-2xl">
              {PRODUCT_NAME} is the ATS for recruiters and hiring managers who
              need pipelines, collaboration, and candidate experience in one
              calm workspace — not another bloated enterprise tool.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-xl bg-zinc-900 hover:bg-zinc-800 h-12 px-6"
              >
                <Link href="/sign-up">
                  Start free
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-xl h-12 px-6"
              >
                <Link href="/features">See features</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-zinc-400">
              No credit card required · Multi-tenant · Career pages included
            </p>
          </div>

          {/* Product preview strip */}
          <div className="mt-16 rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 bg-zinc-50">
              <div className="size-2.5 rounded-full bg-red-400" />
              <div className="size-2.5 rounded-full bg-amber-400" />
              <div className="size-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs font-medium text-zinc-400">
                app.{PRODUCT_NAME.toLowerCase()}.online — Pipeline
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-6 bg-zinc-50/50">
              {["Applied", "Screening", "Interview", "Offer"].map((stage, i) => (
                <div
                  key={stage}
                  className="rounded-xl border border-zinc-200 bg-white p-3 space-y-2 min-h-[120px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {stage}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-300">
                      {3 - i || 1}
                    </span>
                  </div>
                  {[1, 2].slice(0, i === 3 ? 1 : 2).map((n) => (
                    <div
                      key={n}
                      className="rounded-lg bg-zinc-50 border border-zinc-100 px-2 py-2"
                    >
                      <div className="h-2 w-16 rounded bg-zinc-200 mb-1.5" />
                      <div className="h-1.5 w-10 rounded bg-zinc-100" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-24">
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
            Everything you need to run hiring
          </h2>
          <p className="mt-3 text-zinc-600">
            From public career pages to internal scorecards — one system for
            jobs, candidates, and communication.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-zinc-200 bg-white p-6 hover:border-zinc-300 hover:shadow-sm transition-all"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-white mb-4">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-semibold text-zinc-900">{f.title}</h3>
                <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-zinc-100 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-24">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 mb-12">
            Up and running in three steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.step} className="relative">
                <span className="text-4xl font-bold text-zinc-200">{s.step}</span>
                <h3 className="mt-2 text-lg font-semibold text-zinc-900">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-24">
        <div className="rounded-3xl bg-zinc-900 px-8 py-12 sm:px-12 sm:py-16 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-violet-600/30 via-transparent to-transparent" />
          <div className="relative">
            <Briefcase className="mx-auto size-10 text-white/80 mb-4" />
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to streamline hiring?
            </h2>
            <p className="mt-3 text-zinc-400 max-w-lg mx-auto">
              Create your organization, publish a career page, and start moving
              candidates through a pipeline that fits your team.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-xl bg-white text-zinc-900 hover:bg-zinc-100 h-12 px-6"
              >
                <Link href="/sign-up">
                  Get started free
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-xl border-zinc-700 text-white hover:bg-zinc-800 h-12 px-6"
              >
                <Link href="/pricing">View pricing</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-zinc-400">
              {["Unlimited jobs on Pro", "Career subdomains", "Team roles"].map(
                (t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    {t}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
