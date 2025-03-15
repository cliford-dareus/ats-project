"use client";

import React, { useCallback, useTransition } from "react";
import { MapPin, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createNewSearchParam } from "@/lib/utils";

const JobListingSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const locationParam = searchParams.get("location");
  const departmentParam = searchParams.get("department");

  // Create new search params
  const createQueryString = useCallback(
    (params: Record<string, string[] | number | null>) => {
      return createNewSearchParam(params, searchParams);
    },
    [searchParams],
  );

  // LOCATION
  const locations = locationParam ? locationParam.split(",") : [];
  const departments = departmentParam ? departmentParam.split(",") : [];

  // Update locations in query params
  const updateLocations = (newLocations: string[] | null) => {
    startTransition(() => {
      const newQueryString = createQueryString({
        location: newLocations?.length
          ? newLocations.map((loc) => loc.trim())
          : null,
      });
      router.push(`${pathname}?${newQueryString}`, { scroll: false });
    });
  };

  // Update departments in query params
  const updateDepartments = (newDepartments: string[] | null) => {
    startTransition(() => {
      const newQueryString = createQueryString({
        department: newDepartments?.length
          ? newDepartments.map((dep) => dep.trim())
          : null,
      });
      router.push(`${pathname}?${newQueryString}`, { scroll: false });
    });
  };

  return (
    <div className="p-4 flex flex-col h-full">
      {/* <div className="font-medium text-xl">Filters</div> */}

      {/* LOCATION */}
      <div className="mt-[24px]">
        <div className="flex items-center gap-2">
          <MapPin size={24} />
          <p className="text-gray-700 dark:text-gray-400 font-bold">LOCATION</p>
        </div>

        <div className="py-2">
          {locations?.length == 0 ? (
            <div
              className="flex"
              onClick={() => {
                updateLocations(["austin", "ny"]);
              }}
            >
              <Plus size={20} />
            </div>
          ) : (
            <div className="flex gap-4 items-center flex-wrap">
              {locations?.map((location) => (
                <div key={location} className="py-1 px-2 bg-muted">
                  {location}
                </div>
              ))}
              <Plus size={20} />
            </div>
          )}
        </div>
      </div>

      {/* CLEAR FILTERS */}
      <div className="mt-auto">
        <Button
          onClick={() => {
            startTransition(() => {
              router.push(
                `${pathname}?${createQueryString({
                  location: null,
                  department: null,
                })}`,
                { scroll: false },
              );
            });
          }}
        >
          Clear all filters
        </Button>
      </div>
    </div>
  );
};

export default JobListingSidebar;
