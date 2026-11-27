"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, FileUser, Search, Users } from "lucide-react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { global_search_action } from "@/server/actions/global-search-actions";
import type { GlobalSearchResults } from "@/server/queries/drizzle/global-search";

/**
 * Global search palette for the dashboard header.
 *
 * Distinct from the per-page sidebar search (`AppSidebarSearch`, left
 * untouched): this searches across jobs, candidates and applications in
 * the active org and jumps straight to the matching detail page. The
 * server action enforces org scoping and the per-group view permissions,
 * so the client only ever renders rows the user may see.
 *
 * Opens with Cmd/Ctrl+K or the header button. Input is debounced (300ms)
 * and no request fires until at least 2 characters are typed.
 */

const EMPTY_RESULTS: GlobalSearchResults = {
    jobs: [],
    candidates: [],
    applications: [],
};

const GlobalSearch = () => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<GlobalSearchResults>(EMPTY_RESULTS);
    const [loading, setLoading] = useState(false);

    const debouncedQuery = useDebounce(query, 300);

    // Cmd/Ctrl+K toggles the palette from anywhere in the dashboard.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, []);

    // Debounced server search; stale responses are ignored.
    useEffect(() => {
        const term = debouncedQuery.trim();
        if (term.length < 2) {
            setResults(EMPTY_RESULTS);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        global_search_action(term)
            .then((res) => {
                if (!cancelled) setResults(res);
            })
            .catch(() => {
                if (!cancelled) setResults(EMPTY_RESULTS);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [debouncedQuery]);

    const goTo = (href: string) => {
        setOpen(false);
        setQuery("");
        router.push(href);
    };

    const totalResults =
        results.jobs.length + results.candidates.length + results.applications.length;
    const showHint = query.trim().length < 2;

    return (
        <>
            <Button
                variant="outline"
                onClick={() => setOpen(true)}
                className="hidden sm:flex items-center gap-2 text-muted-foreground font-normal"
                aria-label="Search jobs, candidates and applications"
            >
                <Search className="size-4" />
                <span>Search...</span>
                <kbd className="pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
            {/* Compact icon-only trigger for narrow screens. */}
            <Button
                variant="outline"
                size="icon"
                onClick={() => setOpen(true)}
                className="sm:hidden text-muted-foreground"
                aria-label="Search jobs, candidates and applications"
            >
                <Search className="size-4" />
            </Button>

            {/*
                CommandDialog is not used here: it hardcodes cmdk's default
                client-side filtering, which would hide server matches whose
                matched text (e.g. a candidate's email) is not in the item
                value. This Dialog + Command pair is the same shell with
                shouldFilter={false}, since results come pre-filtered from
                the server.
            */}
            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen);
                    if (!nextOpen) setQuery("");
                }}
            >
                <DialogContent className="overflow-hidden p-0">
                    <DialogTitle className="sr-only">
                        Search jobs, candidates and applications
                    </DialogTitle>
                    <Command
                        label="Global search"
                        shouldFilter={false}
                        className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
                    >
                <CommandInput
                    value={query}
                    onValueChange={setQuery}
                    placeholder="Search jobs, candidates, applications..."
                />
                <CommandList>
                    {/*
                        Results come pre-filtered from the server, so cmdk's
                        built-in client-side filtering must stay off or it
                        would hide server matches.
                    */}
                    {loading && (
                        <CommandItem disabled>Searching...</CommandItem>
                    )}
                    {!loading && showHint && (
                        <CommandItem disabled>
                            Type at least 2 characters to search jobs, candidates
                            and applications.
                        </CommandItem>
                    )}
                    {!loading && !showHint && totalResults === 0 && (
                        <CommandEmpty>
                            No results found for &quot;{query.trim()}&quot;.
                        </CommandEmpty>
                    )}
                    {results.jobs.length > 0 && (
                        <CommandGroup heading="Jobs">
                            {results.jobs.map((job) => (
                                <CommandItem
                                    key={`job-${job.id}`}
                                    value={`job-${job.id}-${job.title}`}
                                    onSelect={() => goTo(`/jobs/${job.id}`)}
                                >
                                    <BriefcaseBusiness className="size-4 text-muted-foreground" />
                                    <span className="truncate">{job.title}</span>
                                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                        {[job.location, job.status]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                    {results.candidates.length > 0 && (
                        <CommandGroup heading="Candidates">
                            {results.candidates.map((candidate) => (
                                <CommandItem
                                    key={`candidate-${candidate.id}`}
                                    value={`candidate-${candidate.id}-${candidate.name}`}
                                    onSelect={() =>
                                        goTo(`/candidates/${candidate.id}`)
                                    }
                                >
                                    <Users className="size-4 text-muted-foreground" />
                                    <span className="truncate">
                                        {candidate.name}
                                    </span>
                                    <span className="ml-auto shrink-0 truncate text-xs text-muted-foreground">
                                        {candidate.email}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                    {results.applications.length > 0 && (
                        <CommandGroup heading="Applications">
                            {results.applications.map((application) => (
                                <CommandItem
                                    key={`application-${application.id}`}
                                    value={`application-${application.id}-${application.candidateName ?? ""}-${application.jobTitle ?? ""}`}
                                    onSelect={() =>
                                        goTo(`/applications/${application.id}`)
                                    }
                                >
                                    <FileUser className="size-4 text-muted-foreground" />
                                    <span className="truncate">
                                        {application.candidateName ??
                                            "Unknown candidate"}
                                        {" — "}
                                        {application.jobTitle ?? "Unknown job"}
                                    </span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                </CommandList>
                    </Command>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default GlobalSearch;
