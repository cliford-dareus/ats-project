import {Check, ChevronRight, ChevronsUpDown, Filter, LucideProps, MapPin, RotateCcw} from "lucide-react";
import {motion, AnimatePresence} from "framer-motion";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import React, {useCallback, useEffect, useState, useTransition} from "react";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {cn, createNewSearchParam} from "@/lib/utils";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList} from "@/components/ui/command";
import {CITIES} from "@/lib/constant";
import {useDebounce} from "@/hooks/use-debounce";

export interface FilterOption {
    value: string;
    label: string;
    icon?: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
    color?: string;
    count?: number;
};

interface FilterGroupProps {
    items: (string | FilterOption)[];
    selectedValues: string[];
    onToggle: (value: string) => void;
};

type Props = {
    config: {
        id: string
        title: string
        icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>
        items: (string | FilterOption)[];
    }[];
}

const AppSidebarFilter = ({config}: Props) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [, startTransition] = useTransition();

    // Location search input
    const [open, setOpen] = useState(false);
    const [locationInput, setLocationInput] = useState(
        searchParams.get("location") || ""
    );
    const debouncedLocation = useDebounce(locationInput.trim(), 600)

    // Create query string helper
    const createQueryString = useCallback(
        (params: Record<string, string[] | string | number | null>) => {
            return createNewSearchParam(params, searchParams);
        },
        [searchParams]
    );

    // Get current selected values for multi-select filters
    const getSelected = useCallback(
        (key: string) => searchParams.get(key)?.split(",").filter(Boolean) || [],
        [searchParams]
    );

    // Toggle multi-select filter (status, type, etc.)
    const updateMultiFilter = useCallback(
        (key: string, value: string) => {
            startTransition(() => {
                const current = getSelected(key);
                const next = current.includes(value)
                    ? current.filter((v) => v !== value)
                    : [...current, value];

                const newQuery = createQueryString({
                    [key]: next.length ? next.join(",") : null,
                });

                router.push(`${pathname}?${newQuery}`, {scroll: false});
            });
        },
        [getSelected, createQueryString, router, pathname]
    );

    // Handle location (single value, not array)
    useEffect(() => {
        if (searchParams.get("location") ?? "" !== debouncedLocation) {
            startTransition(() => {
                const newQuery = createQueryString({
                    location: debouncedLocation || null,
                });
                router.push(`${pathname}?${newQuery}`, {scroll: false});
            });
        }
    }, [debouncedLocation, searchParams, createQueryString, router, pathname]);

    const clearAll = useCallback(() => {
        startTransition(() => {
            router.push(pathname, {scroll: false});
        });
    }, [router, pathname]);

    const hasFilters = Array.from(searchParams.keys()).length > 0;

    return (
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Filter size={12} className="text-slate-900"/>
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Filters</h2>
                </div>

                <AnimatePresence>
                    {hasFilters ? (
                        <motion.button
                            initial={{opacity: 0, x: 10}}
                            animate={{opacity: 1, x: 0}}
                            exit={{opacity: 0, x: 10}}
                            onClick={clearAll}
                            className="text-[10px] font-bold text-primary hover:text-accent flex items-center gap-1 uppercase tracking-tighter"
                        >
                            <RotateCcw size={10}/>
                            Reset
                        </motion.button>
                    ) : (<button
                        className="text-[10px] font-bold text-white flex items-center gap-1 uppercase tracking-tighter">
                        <RotateCcw size={10}/>.</button>)}
                </AnimatePresence>
            </div>


            <Accordion type="single" defaultValue="status">
                {config.map((group) => (
                    <AccordionItem key={group.id} value={group.id}>
                        <AccordionTrigger className="px-1 py-2 underline-primary">
                            <div className="flex items-center gap-2">
                                <group.icon size={14} className="text-slate-400"/>
                                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-[0.15em]">
                                        {group.title}
                                    </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-1">
                            <FilterGroup
                                key={group.id}
                                // title={group.title}
                                // icon={group.icon}
                                items={group.items}
                                selectedValues={getSelected(group.id)}
                                onToggle={(val) => updateMultiFilter(group.id, val)}
                            />
                        </AccordionContent>
                    </AccordionItem>
                ))}

                <AccordionItem value="location">
                    <AccordionTrigger className="px-1 py-2 no-underline hover:no-underline">
                        <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-slate-400"/>
                            <span className="font-bold text-[10px] text-slate-400 uppercase tracking-[0.15em]">
                                    Location
                                </span>
                        </div>
                    </AccordionTrigger>

                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                aria-expanded={open}
                                className={cn(
                                    "flex w-full justify-between items-center px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all",
                                    !locationInput && "text-muted-foreground"
                                )}
                            >
                                {locationInput || "Select location..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                            </button>
                        </PopoverTrigger>

                        <PopoverContent className="w-full p-0" align="start">
                            <Command shouldFilter={true}>
                                <CommandInput
                                    placeholder="Type city or 'Remote'..."
                                    value={locationInput}
                                    onValueChange={setLocationInput}
                                    className="h-9"
                                />
                                <CommandList>
                                    <CommandEmpty>No location found.</CommandEmpty>
                                    <CommandGroup>
                                        {CITIES.map((city) => (
                                            <CommandItem
                                                key={city}
                                                value={city}
                                                onSelect={(currentValue) => {
                                                    const newValue = currentValue === locationInput ? "" : currentValue;
                                                    setLocationInput(newValue);
                                                    setOpen(false);

                                                    // Apply filter immediately (or debounce if preferred)
                                                    // startTransition(() => {
                                                    //     const newQuery = createQueryString({
                                                    //         location: newValue || null,
                                                    //     });
                                                    //     router.push(`${pathname}?${newQuery}`, { scroll: false });
                                                    // });
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        locationInput === city ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {city}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </AccordionItem>
            </Accordion>
        </div>

    );
};

export const FilterGroup: React.FC<FilterGroupProps> = ({
                                                            // title,
                                                            // icon: Icon,
                                                            items,
                                                            selectedValues,
                                                            onToggle
                                                        }) => {
    return (
        <div className="">
            {/* <div className="flex items-center gap-2 px-1">
                <Icon size={14} className="text-slate-400" />
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-[0.15em]">{title}</span>
            </div> */}

            <div className="space-y-0.5">
                <AnimatePresence mode="wait" initial={false}>
                    {items.map((item) => {
                        const value = typeof item === 'string' ? item : item.value;
                        const label = typeof item === 'string' ? item : item.label;
                        const isSelected = selectedValues.includes(value);
                        const StatusIcon = typeof item === 'object' ? item.icon : null;

                        return (
                            <motion.button
                                key={value}
                                initial={{opacity: 0, height: 0}}
                                animate={{opacity: 1, height: 'auto'}}
                                exit={{opacity: 0, height: 0}}
                                onClick={() => onToggle(value)}
                                className={`w-full flex items-center justify-between px-2 py-1 rounded-xl text-[13px] transition-all duration-200 group ${isSelected
                                    ? "bg-black text-white shadow-md shadow-blue-200"
                                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    {typeof item === 'object' && item.color && !isSelected && (
                                        <span className={`w-1 h-1 rounded-full ${item.color}`}/>
                                    )}
                                    {StatusIcon && <StatusIcon size={12}
                                                               className={isSelected ? "text-white" : "text-slate-400"}/>}
                                    <span className="truncate max-w-[130px]">{label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {typeof item === 'object' && item.count !== undefined && (
                                        <span
                                            className={`text-[10px] font-bold px-1 py-0.5 rounded-md ${isSelected ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500"
                                            }`}>
                                            {item.count}
                                        </span>
                                    )}
                                    {!isSelected && (
                                        <ChevronRight
                                            size={12}
                                            className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-300"
                                        />
                                    )}
                                </div>
                            </motion.button>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    )
};

export default AppSidebarFilter;
