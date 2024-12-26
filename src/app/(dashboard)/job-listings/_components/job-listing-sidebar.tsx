'use client'

import React, {useCallback, useEffect, useTransition} from 'react';
import {MapPin, Plus} from "lucide-react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {Button} from "@/components/ui/button";

const JobListingSidebar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [isLoading, startTransition] = useTransition()

    // Create new search params
    const createQueryString = useCallback(
        (params: Record<string, string[] | number | null>) => {
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

    // LOCATION
    const [locations, setLocations] = React.useState<string[]>([])
    useEffect(() => {
        startTransition(() => {
            router.push(`${pathname}?${createQueryString({location: locations})}`)
        });
    }, [locations]);

    return (
        <div className="p-4">
            <div className="font-medium text-2xl">Filters</div>

            {/* LOCATION */}
            <div className="mt-[24px]">
                <div className="flex items-center gap-2">
                    <MapPin size={24}/>
                    <p className="text-gray-700 dark:text-gray-400 font-bold">LOCATION</p>
                </div>

                <div className="py-2">
                    {locations.length == 0 ?
                        <div
                            className="flex"
                            onClick={() => {
                                setLocations(['austin', 'ny'])
                            }}>
                            <Plus size={20}/>
                        </div>
                        :
                        <div className="flex gap-4 items-center flex-wrap">
                            {locations.map(location => (
                                <div key={location} className="py-1 px-2 bg-muted">{location}</div>
                            ))}
                            <Plus size={20}/>
                        </div>
                    }
                </div>
            </div>


            {/*    CLEAR FILTERS*/}
            <div className="">
                <Button onClick={() => {
                    setLocations([])
                }}>Clear all filter</Button>
            </div>
        </div>
    );
};

export default JobListingSidebar;