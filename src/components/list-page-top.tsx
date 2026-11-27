"use client";

import ExtractFileButton from "@/components/extract-table-button";
import { ApplicationResponseType, CandidatesResponseType, JobResponseType } from "@/types";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createNewSearchParam } from "@/lib/utils";

type ListPageTopProps = {
    name: string;
    count: number;
    file: string;
    data?: JobResponseType[] | ApplicationResponseType[] | CandidatesResponseType[]
};

const ListPageTop = ({ name, count, file, data }: ListPageTopProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    // Sort is a ?sort= URL param the list pages read server-side. Only the
    // values the queries understand are offered; anything else falls back
    // to the query default (newest first).
    const sort = searchParams.get("sort") ?? "newest";
    const onSortChange = (value: string) => {
        router.push(
            `${pathname}?${createNewSearchParam({ sort: value === "newest" ? null : value }, searchParams)}`,
            { scroll: false },
        );
    };
    return (
        <>
            <div className="flex items-center justify-between p-4 bg-muted border rounded-2xl mb-2 w-full">
                <div className="items-center flex gap-2">
                    <h1 className="text-2xl font-bold text-gray-900">{name.toUpperCase()}</h1>
                    <span className="px-2 bg-slate-300 flex items-center justify-center rounded">
                        {count}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <ExtractFileButton file_name={file} data={data!} />

                    <div className="flex items-center gap-3 border rounded-md px-4">
                        <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sort By</Label>
                        <Select value={sort} onValueChange={onSortChange}>
                            <SelectTrigger className="min-w-30 bg-transparent !p-0 text-xs uppercase tracking-wider border-none outline-none focus:outline-none">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-50 !p-0 border-none rounded-md text-xs font-medium focus:outline-none transition-all">
                                <SelectGroup className="outline-none">
                                    <SelectItem value="newest">Newest First</SelectItem>
                                    <SelectItem value="oldest">Oldest First</SelectItem>
                                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ListPageTop;
