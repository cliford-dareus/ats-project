"use client";

import React, { useEffect, useState } from "react";
import CircleChart from "@/app/(dashboard)/dashboard/_components/charts/circle-chart";
import RadarChart, {
  ChartInterface,
} from "@/app/(dashboard)/dashboard/_components/charts/radar-chart";
import LineChart from "@/app/(dashboard)/dashboard/_components/charts/line-chart";
import AreaChart from "@/app/(dashboard)/dashboard/_components/charts/area-chart";
import { cn, RANGE_OPTIONS } from "@/lib/utils";
import ComponentPicker from "@/app/(dashboard)/dashboard/_components/component-picker";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, DatabaseZap } from "lucide-react";
import { useSafeLocalStorage } from "@/hooks/use-safe-localstorage";

type Props = {
  job_open: ChartInterface[];
  hired_candidates: ChartInterface[];
  job_listings: ChartInterface[];
  queryKey: string;
};

const ChartCard = ({
  job_open,
  job_listings,
  hired_candidates,
  queryKey,
}: Props) => {
  const [storedValue, setValue] = useSafeLocalStorage(`activeSection_${queryKey}`,`{section1: "lineChart"}`,);
  const [sections, setSections] = useState<{ [key: string]: string }>(() => {
    // const storedValue = localStorage.getItem(`activeSection_${queryKey}`);
    console.log("storedValue", storedValue);
    return storedValue ? storedValue : { section1: "lineChart" };
  });
  const [activeData, setActiveData] = useState<ChartInterface[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({from: subDays(new Date(), 29),to: new Date(),});

  const components = {
    circleChart: () => <CircleChart data={activeData} />,
    radarChart: () => <RadarChart data={activeData} />,
    lineChart: () => <LineChart data={activeData} />,
    areaChart: () => <AreaChart data={activeData} />,
  } as { [key: string]: () => React.JSX.Element };

  const handleComponentChange = (section: string, component: string) => {
    setSections((prev) => ({ ...prev, [section]: component }));
  };

  const setRange = (range: keyof typeof RANGE_OPTIONS | DateRange) => {
    const params = new URLSearchParams(searchParams);
    if (typeof range === "string") {
      params.set(queryKey, range);
      params.delete(`${queryKey}From`);
      params.delete(`${queryKey}To`);
    } else {
      if (range.from == null || range.to == null) return;
      params.delete(queryKey);
      params.set(`${queryKey}From`, range.from.toISOString());
      params.set(`${queryKey}To`, range.to.toISOString());
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleDataChange = (value: string) => {
    switch (value) {
      case "Open Job":
        setActiveData(job_open);
        break;
      case "Job Listings":
        setActiveData(job_listings);
        break;
      case "Hired Candidates":
        setActiveData(hired_candidates);
        break;
      default:
        setActiveData([]);
    }
  };

  useEffect(() => {
    setValue(`activeSection_${queryKey}`, JSON.stringify(sections));
    // localStorage.setItem(`activeSection_${queryKey}`, JSON.stringify(sections));
  }, [sections, queryKey, setValue]);

  useEffect(() => {
    setActiveData(hired_candidates);
  }, [searchParams, hired_candidates]);

  return (
    <>
      {Object.keys(sections).map((section) => (
        <div
          key={section}
          className={cn(
            "h-[400px] md:col-span-2 row-span-1 rounded-xl group/bento transition duration-200 shadow-input dark:shadow-none dark:bg-black dark:border-white/[0.2] bg-white border-none border-transparent",
          )}
        >
          <div className="relative h-full">
            <div className="flex gap-2 items-center absolute right-4 top-4">
              <ComponentPicker
                section={section}
                selectedComponent={sections[section]}
                onChange={handleComponentChange}
                components={Object.keys(components)}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <DatabaseZap size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {["Open Job", "Job Listings", "Hired Candidates"].map(
                    (value, key) => (
                      <DropdownMenuItem
                        onClick={() => handleDataChange(value)}
                        key={key}
                      >
                        {value}
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {Object.entries(RANGE_OPTIONS).map(([key, value]) => (
                    <DropdownMenuItem
                      onClick={() =>
                        setRange(key as keyof typeof RANGE_OPTIONS)
                      }
                      key={key}
                    >
                      {value.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Custom</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <div>
                        <Calendar
                          mode="range"
                          disabled={{ after: new Date() }}
                          selected={dateRange}
                          defaultMonth={dateRange?.from}
                          onSelect={setDateRange}
                          numberOfMonths={2}
                        />
                        <DropdownMenuItem className="hover:bg-auto">
                          <Button
                            onClick={() => {
                              if (dateRange == null) return;
                              setRange(dateRange);
                            }}
                            disabled={dateRange == null}
                            className="w-full"
                          >
                            Submit
                          </Button>
                        </DropdownMenuItem>
                      </div>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {React.createElement(components[sections[section]])}
          </div>
        </div>
      ))}
    </>
  );
};

export default ChartCard;
