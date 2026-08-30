import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/lib/marketing";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Pricing | ${PRODUCT_NAME}`,
  description: `Simple pricing for ${PRODUCT_NAME} — start free and scale with your hiring team.`,
};

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "For small teams trying modern ATS workflows.",
    cta: "Get started",
    href: "/sign-up",
    highlighted: false,
    features: [
      "1 organization",
      "Up to 3 open jobs",
      "Career page subdomain",
      "Basic pipeline stages",
      "Email templates",
    ],
  },
  {
    name: "Pro",
    price: "$49",
    period: "per month",
    description: "For growing teams that hire every week.",
    cta: "Start Pro trial",
    href: "/sign-up",
    highlighted: true,
    features: [
      "Unlimited jobs",
      "AI resume scoring",
      "Automations & triggers",
      "Team roles & mentions",
      "Reports & exports",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Security, SSO, and volume for larger orgs.",
    cta: "Contact sales",
    href: "/contact",
    highlighted: false,
    features: [
      "Everything in Pro",
      "SSO / advanced roles",
      "Custom integrations",
      "Dedicated support",
      "SLA options",
    ],
  },
];

const PricingPage = () => {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <p className="text-sm font-semibold text-violet-600 mb-2">Pricing</p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
          Simple plans that scale with hiring
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          Start free. Upgrade when your pipeline and team need more power.
          Prices shown are illustrative — wire to billing when ready.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "rounded-2xl border p-6 sm:p-8 flex flex-col bg-white",
              plan.highlighted
                ? "border-zinc-900 shadow-xl shadow-zinc-200/80 relative"
                : "border-zinc-200"
            )}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1">
                Most popular
              </span>
            )}
            <h2 className="text-lg font-semibold text-zinc-900">{plan.name}</h2>
            <p className="mt-1 text-sm text-zinc-500">{plan.description}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-zinc-900">
                {plan.price}
              </span>
              {plan.period && (
                <span className="text-sm text-zinc-400">/{plan.period}</span>
              )}
            </div>
            <ul className="mt-8 space-y-3 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                  <Check className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              asChild
              className={cn(
                "mt-8 w-full rounded-xl",
                plan.highlighted
                  ? "bg-zinc-900 hover:bg-zinc-800"
                  : ""
              )}
              variant={plan.highlighted ? "default" : "outline"}
            >
              <Link href={plan.href}>{plan.cta}</Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingPage;
