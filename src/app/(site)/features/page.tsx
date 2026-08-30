import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Calendar,
  FileText,
  Globe,
  Kanban,
  Lock,
  MessageSquare,
  Plug,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/lib/marketing";

export const metadata: Metadata = {
  title: `Features | ${PRODUCT_NAME}`,
  description: `Explore ${PRODUCT_NAME} features — pipelines, AI scoring, career pages, and more.`,
};

const GROUPS = [
  {
    title: "Recruiting core",
    items: [
      {
        icon: Kanban,
        title: "Job pipelines",
        text: "Custom stages, drag-and-drop boards, and position ordering per stage.",
      },
      {
        icon: UserCheck,
        title: "Candidates & applications",
        text: "Unified profiles, attachments, status, and multi-job applications.",
      },
      {
        icon: Calendar,
        title: "Interviews",
        text: "Schedule video, phone, or onsite interviews with status tracking.",
      },
      {
        icon: FileText,
        title: "Scorecards",
        text: "Structured feedback and recommendations after every interview.",
      },
    ],
  },
  {
    title: "Automation & AI",
    items: [
      {
        icon: Bot,
        title: "Resume scoring",
        text: "LLM-assisted fit, skills, and experience scores with summaries.",
      },
      {
        icon: Plug,
        title: "Smart triggers",
        text: "Fire emails and workflows on apply, stage change, and more.",
      },
      {
        icon: MessageSquare,
        title: "Email templates",
        text: "Reusable templates and a communication inbox for outbound mail.",
      },
    ],
  },
  {
    title: "Experience & access",
    items: [
      {
        icon: Globe,
        title: "Career pages",
        text: "Branded subdomains where candidates browse and apply to open roles.",
      },
      {
        icon: Lock,
        title: "Organizations & roles",
        text: "Multi-tenant workspaces with Clerk org roles and membership sync.",
      },
    ],
  },
];

const FeaturesPage = () => {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
      <div className="max-w-2xl mb-14">
        <p className="text-sm font-semibold text-violet-600 mb-2">Features</p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
          Built for the full hiring loop
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          From the first application to the signed offer — tools that keep your
          team aligned and candidates informed.
        </p>
      </div>

      <div className="space-y-16">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-6">
              {group.title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex gap-4 rounded-2xl border border-zinc-200 p-5 bg-white"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500 leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 flex flex-wrap gap-3">
        <Button asChild className="rounded-xl">
          <Link href="/sign-up">
            Start free <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/pricing">Pricing</Link>
        </Button>
      </div>
    </div>
  );
};

export default FeaturesPage;
