import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME, ROOT_DOMAIN } from "@/lib/marketing";

export const metadata: Metadata = {
  title: `Contact | ${PRODUCT_NAME}`,
  description: `Get in touch with the ${PRODUCT_NAME} team.`,
};

const ContactPage = () => {
  const support_email = `hello@${ROOT_DOMAIN}`;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
      <p className="text-sm font-semibold text-violet-600 mb-2">Contact</p>
      <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
        Talk to us
      </h1>
      <p className="mt-4 text-lg text-zinc-600">
        Questions about plans, onboarding, or partnerships? We are happy to
        help.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <a
          href={`mailto:${support_email}`}
          className="rounded-2xl border border-zinc-200 bg-white p-6 hover:border-zinc-300 hover:shadow-sm transition-all group"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-white mb-4">
            <Mail className="size-5" />
          </div>
          <h2 className="font-semibold text-zinc-900 group-hover:text-zinc-700">
            Email
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{support_email}</p>
        </a>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 mb-4">
            <MessageCircle className="size-5" />
          </div>
          <h2 className="font-semibold text-zinc-900">Product feedback</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Already using {PRODUCT_NAME}? Share ideas from inside the app or
            email us with the subject line “Feedback”.
          </p>
        </div>
      </div>

      <div className="mt-10">
        <Button asChild className="rounded-xl">
          <Link href="/sign-up">Create an account</Link>
        </Button>
      </div>
    </div>
  );
};

export default ContactPage;
