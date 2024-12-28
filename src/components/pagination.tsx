'use client'

import React, {useCallback, useMemo} from 'react';
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink, PaginationNext,
    PaginationPrevious
} from "@/components/ui/pagination";

type Props = {
    pageCount: number;
}

const PaginationElement = ({pageCount}: Props) => {
    const pathname = usePathname();
    const router = useRouter();

    const searchParams = useSearchParams();
    const page = searchParams.get("page") ?? "1";
    const per_page = searchParams.get("per_page") ?? "8";

    const paginationRange = useMemo(() => {
        const offset = 3;
        const range = [];

        for (
            let i = Math.max(2, Number(page) - offset);
            i <= Math.min(pageCount - 1, Number(page) + offset);
            i++
        ) {
            range.push(i);
        }

        if (Number(page) - offset > 2) {
            range.unshift("...");
        }
        if (Number(page) + offset < pageCount - 1) {
            range.push("...");
        }

        range.unshift(1);
        if (pageCount !== 1) {
            range.push(pageCount);
        }

        if (pageCount === 0) {
            range.shift()
        }

        return range;
    }, [pageCount, page]);

    const createQueryString = useCallback(
        (params: { page: number; per_page: string }) => {
            const newSearchParams = new URLSearchParams(searchParams?.toString());

            for (const [key, value] of Object.entries(params)) {
                if (value === null || (Array.isArray(value) && value.length == 0)) {
                    newSearchParams.delete(key);
                } else {
                    newSearchParams.set(key, String(value));
                }
            }
            return newSearchParams.toString();
        },
        [searchParams]
    );
    return (
        <div className="mt-4">
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious onClick={() => {
                            router.push(
                                `${pathname}?${createQueryString({
                                    page: Number(page) === 1 ? 1 : Number(page) - 1,
                                    per_page: per_page ?? null,
                                })}`
                            );
                        }}/>
                    </PaginationItem>

                    {paginationRange.map((page) => (
                        typeof page !== 'string' ?
                            <PaginationItem key={page}>
                                <PaginationLink href="#">{page}</PaginationLink>
                            </PaginationItem>
                            :
                            <PaginationItem key={page}>
                                <PaginationEllipsis/>
                            </PaginationItem>
                    ))}
                    <PaginationItem>
                        <PaginationNext
                            onClick={() => {
                                router.push(
                                    `${pathname}?${createQueryString({
                                        page: Number(page) + 1,
                                        per_page: per_page ?? null,
                                    })}`
                                );
                            }}/>
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
};

export default PaginationElement;