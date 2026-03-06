"use client";

import React, { useCallback, useTransition, useState } from "react";
import {
    MapPin,
    Plus,
    BriefcaseBusiness,
    Building2,
    DollarSign,
    Calendar,
    Search,
    Clock,
    Users,
    Target,
    TrendingUp,
    CheckCircle,
    XCircle,
    Archive,
    Eye
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { createNewSearchParam } from "@/lib/utils";

const JobListingSidebar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [, startTransition] = useTransition();
    const [searchTerm, setSearchTerm] = useState("");

    const locationParam = searchParams.get("location");
    const departmentParam = searchParams.get("department");
    const statusParam = searchParams.get("status");
    const salaryParam = searchParams.get("salary");

    // Create new search params
    const createQueryString = useCallback(
        (params: Record<string, string[] | number | null>) => {
            return createNewSearchParam(params, searchParams);
        },
        [searchParams],
    );

    // Parse current filters
    const locations = locationParam ? locationParam.split(",") : [];
    const departments = departmentParam ? departmentParam.split(",") : [];
    const statuses = statusParam ? statusParam.split(",") : [];
    const salaryRanges = salaryParam ? salaryParam.split(",") : [];

    // Toggle filter value
    const toggleFilter = (currentValues: string[], value: string, updateFn: (values: string[] | null) => void) => {
        const newValues = currentValues.includes(value)
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value];
        updateFn(newValues.length > 0 ? newValues : null);
    };

    // Update functions
    const updateLocations = (newLocations: string[] | null) => {
        startTransition(() => {
            const newQueryString = createQueryString({
                location: newLocations?.length ? newLocations : null,
            });
            router.push(`${pathname}?${newQueryString}`, { scroll: false });
        });
    };

    const updateDepartments = (newDepartments: string[] | null) => {
        startTransition(() => {
            const newQueryString = createQueryString({
                department: newDepartments?.length ? newDepartments : null,
            });
            router.push(`${pathname}?${newQueryString}`, { scroll: false });
        });
    };

    const updateStatuses = (newStatuses: string[] | null) => {
        startTransition(() => {
            const newQueryString = createQueryString({
                status: newStatuses?.length ? newStatuses : null,
            });
            router.push(`${pathname}?${newQueryString}`, { scroll: false });
        });
    };

    const updateSalaryRanges = (newSalaryRanges: string[] | null) => {
        startTransition(() => {
            const newQueryString = createQueryString({
                salary: newSalaryRanges?.length ? newSalaryRanges : null,
            });
            router.push(`${pathname}?${newQueryString}`, { scroll: false });
        });
    };

    // Data for filters
    const jobStatuses = [
        { value: "OPEN", label: "Open", icon: CheckCircle, color: "bg-green-500", count: 12 },
        { value: "PENDING", label: "Pending", icon: Clock, color: "bg-yellow-500", count: 5 },
        { value: "DRAFT", label: "Draft", icon: Eye, color: "bg-blue-500", count: 3 },
        { value: "CLOSED", label: "Closed", icon: XCircle, color: "bg-red-500", count: 8 },
        { value: "ARCHIVED", label: "Archived", icon: Archive, color: "bg-gray-500", count: 2 }
    ];

    const commonLocations = [
        "New York", "San Francisco", "Los Angeles", "Chicago", "Austin",
        "Seattle", "Boston", "Denver", "Miami", "Remote"
    ];

    const departmentOptions = [
        "Engineering", "Product", "Design", "Marketing", "Sales",
        "Operations", "HR", "Finance", "Customer Success", "IT"
    ];

    const salaryRangeOptions = [
        "0-50k", "50k-75k", "75k-100k", "100k-125k", "125k-150k", "150k+"
    ];

    const quickActions = [
        { id: "create-job", name: "Create Job", icon: Plus, color: "bg-blue-500" },
        { id: "bulk-actions", name: "Bulk Actions", icon: Target, color: "bg-purple-500" },
        { id: "analytics", name: "Job Analytics", icon: TrendingUp, color: "bg-green-500" },
        { id: "templates", name: "Templates", icon: BriefcaseBusiness, color: "bg-orange-500" }
    ];

    return (
        <div className="p-4 flex flex-col h-full space-y-6 overflow-y-auto  no-scrollbar">
            {/* Quick Actions */}
            {/*<div className="space-y-3">*/}
            {/*    <div className="flex items-center gap-2">*/}
            {/*        <BriefcaseBusiness size={20} />*/}
            {/*        <span className="font-medium text-base">Quick Actions</span>*/}
            {/*    </div>*/}
            {/*    <div className="grid grid-cols-2 gap-2">*/}
            {/*        {quickActions.map((action) => {*/}
            {/*            const Icon = action.icon;*/}
            {/*            return (*/}
            {/*                <Button*/}
            {/*                    key={action.id}*/}
            {/*                    variant="outline"*/}
            {/*                    size="sm"*/}
            {/*                    className="flex flex-col items-center gap-1 h-auto py-3"*/}
            {/*                >*/}
            {/*                    <div className={`p-1.5 rounded ${action.color} text-white`}>*/}
            {/*                        <Icon size={14} />*/}
            {/*                    </div>*/}
            {/*                    <span className="text-xs text-center">{action.name}</span>*/}
            {/*                </Button>*/}
            {/*            );*/}
            {/*        })}*/}
            {/*    </div>*/}
            {/*</div>*/}

            {/*<Separator />*/}

            {/* Status Filter */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Clock size={20} />
                    <span className="font-medium text-base">Status</span>
                </div>
                <div className="space-y-2">
                    {jobStatuses.map((status) => {
                        const isSelected = statuses.includes(status.value);
                        const Icon = status.icon;
                        return (
                            <div
                                key={status.value}
                                className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                                    }`}
                                onClick={() => toggleFilter(statuses, status.value, updateStatuses)}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${status.color}`}></span>
                                    <Icon size={16} />
                                    <span className="text-sm">{status.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">{status.count}</Badge>
                                    {isSelected && <Badge variant="secondary">✓</Badge>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Separator />

            {/* Location Filter */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <MapPin size={20} />
                    <span className="font-medium text-base">Location</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                    {commonLocations.map((location) => {
                        const isSelected = locations.includes(location);
                        return (
                            <div
                                key={location}
                                className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                                    }`}
                                onClick={() => toggleFilter(locations, location, updateLocations)}
                            >
                                <span className="text-sm">{location}</span>
                                {isSelected && <Badge variant="secondary">✓</Badge>}
                            </div>
                        );
                    })}
                </div>
            </div>

            <Separator />

            {/* Department Filter */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Building2 size={20} />
                    <span className="font-medium text-base">Department</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                    {departmentOptions.map((department) => {
                        const isSelected = departments.includes(department);
                        return (
                            <div
                                key={department}
                                className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                                    }`}
                                onClick={() => toggleFilter(departments, department, updateDepartments)}
                            >
                                <span className="text-sm">{department}</span>
                                {isSelected && <Badge variant="secondary">✓</Badge>}
                            </div>
                        );
                    })}
                </div>
            </div>

            <Separator />

            {/* Salary Range Filter */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <DollarSign size={20} />
                    <span className="font-medium text-base">Salary Range</span>
                </div>
                <div className="space-y-2">
                    {salaryRangeOptions.map((range) => {
                        const isSelected = salaryRanges.includes(range);
                        return (
                            <div
                                key={range}
                                className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                                    }`}
                                onClick={() => toggleFilter(salaryRanges, range, updateSalaryRanges)}
                            >
                                <span className="text-sm">{range}</span>
                                {isSelected && <Badge variant="secondary">✓</Badge>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* <Separator /> */}

            {/* Quick Stats */}
            {/* <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} />
          <span className="font-medium text-base">Quick Stats</span>
        </div>
        <div className="space-y-2">
          <div className="p-3 rounded border bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-600" />
                <span className="text-sm">Total Applications</span>
              </div>
              <Badge variant="secondary">247</Badge>
            </div>
          </div>
          <div className="p-3 rounded border bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-green-600" />
                <span className="text-sm">This Week</span>
              </div>
              <Badge variant="secondary">18</Badge>
            </div>
          </div>
          <div className="p-3 rounded border bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-purple-600" />
                <span className="text-sm">Avg. Time to Fill</span>
              </div>
              <Badge variant="secondary">12d</Badge>
            </div>
          </div>
        </div>
      </div> */}

            {/* Clear Filters */}
            <div className="mt-auto">
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                        startTransition(() => {
                            router.push(
                                `${pathname}?${createQueryString({
                                    location: null,
                                    department: null,
                                    status: null,
                                    salary: null,
                                })}`,
                                { scroll: false },
                            );
                        });
                        setSearchTerm("");
                    }}
                >
                    Clear All Filters
                </Button>
            </div>
        </div>
    );
};

export default JobListingSidebar;
