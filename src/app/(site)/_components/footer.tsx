import Link from "next/link";
import { Command } from "lucide-react";
import { MARKETING_NAV, PRODUCT_NAME, ROOT_DOMAIN } from "@/lib/marketing";

 const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-3 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
                <Command className="size-4" />
              </div>
              <span className="font-bold text-zinc-900">{PRODUCT_NAME}</span>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
              Modern applicant tracking for teams that hire with speed, clarity,
              and a great candidate experience.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              Product
            </p>
            <ul className="space-y-2">
              {MARKETING_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              Company
            </p>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-zinc-600 hover:text-zinc-900"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-zinc-600 hover:text-zinc-900"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/sign-up"
                  className="text-sm text-zinc-600 hover:text-zinc-900"
                >
                  Get started
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              Legal
            </p>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-zinc-400">Privacy (soon)</span>
              </li>
              <li>
                <span className="text-sm text-zinc-400">Terms (soon)</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-zinc-400">
            © {year} {PRODUCT_NAME}. {ROOT_DOMAIN}
          </p>
          <p className="text-xs text-zinc-400">Built for modern hiring teams</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
