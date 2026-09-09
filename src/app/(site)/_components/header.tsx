"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Command, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { get_app_url, MARKETING_NAV, PRODUCT_NAME } from "@/lib/marketing";

type Props = {
    is_signed_in?: boolean;
};

export default function MarketingHeader({ is_signed_in = false }: Props) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const app_url = get_app_url();

    return (
        <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-sm group-hover:bg-zinc-800 transition-colors">
                        <Command className="size-4" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-zinc-900">
                        {PRODUCT_NAME}
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-1">
                    {MARKETING_NAV.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                                pathname === item.href
                                    ? "text-zinc-900 bg-zinc-100"
                                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="hidden md:flex items-center gap-2">
                    {is_signed_in ? (
                        <Button asChild className="rounded-xl">
                            <a href={`${app_url}/dashboard`}>Open dashboard</a>
                        </Button>
                    ) : (
                        <>
                            <Button variant="ghost" asChild className="rounded-xl">
                                <Link href="/sign-in">Sign in</Link>
                            </Button>
                            <Button asChild className="rounded-xl bg-zinc-900 hover:bg-zinc-800">
                                <Link href="/sign-up">Start free</Link>
                            </Button>
                        </>
                    )}
                </div>

                <button
                    type="button"
                    className="md:hidden p-2 rounded-lg text-zinc-700 hover:bg-zinc-100"
                    onClick={() => setOpen((v) => !v)}
                    aria-label="Toggle menu"
                >
                    {open ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {open && (
                <div className="md:hidden border-t border-zinc-100 bg-white px-4 py-4 space-y-1">
                    {MARKETING_NAV.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                                "block px-3 py-2.5 text-sm font-medium rounded-lg",
                                pathname === item.href
                                    ? "bg-zinc-100 text-zinc-900"
                                    : "text-zinc-600 hover:bg-zinc-50"
                            )}
                        >
                            {item.label}
                        </Link>
                    ))}
                    <div className="pt-3 flex flex-col gap-2 border-t border-zinc-100 mt-2">
                        {is_signed_in ? (
                            <Button asChild className="w-full rounded-xl">
                                <a href={`${app_url}/dashboard`}>Open dashboard</a>
                            </Button>
                        ) : (
                            <>
                                <Button variant="outline" asChild className="w-full rounded-xl">
                                    <Link href="/sign-in">Sign in</Link>
                                </Button>
                                <Button asChild className="w-full rounded-xl">
                                    <Link href="/sign-up">Start free</Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
