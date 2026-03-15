"use client";

import React, { useCallback, useTransition } from "react";
import { Users, MapPin, Plus, Filter, UserCheck, UserX, Clock } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createNewSearchParam } from "@/lib/utils";

const CandidatesSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const statusParam = searchParams.get("status");
  const locationParam = searchParams.get("location");
  const experienceParam = searchParams.get("experience");

  // Create new search params
  const createQueryString = useCallback(
    (params: Record<string, string[] | number | null>) => {
      return createNewSearchParam(params, searchParams);
    },
    [searchParams],
  );

  // Parse current filters
  const statuses = statusParam ? statusParam.split(",") : [];
  const locations = locationParam ? locationParam.split(",") : [];
  const experiences = experienceParam ? experienceParam.split(",") : [];

  // Update status filter
  const updateStatus = (newStatuses: string[] | null) => {
    startTransition(() => {
      const newQueryString = createQueryString({
        status: newStatuses?.length ? newStatuses : null,
      });
      router.push(`${pathname}?${newQueryString}`, { scroll: false });
    });
  };

  // Update location filter
  const updateLocation = (newLocations: string[] | null) => {
    startTransition(() => {
      const newQueryString = createQueryString({
        location: newLocations?.length ? newLocations : null,
      });
      router.push(`${pathname}?${newQueryString}`, { scroll: false });
    });
  };

  // Update experience filter
  const updateExperience = (newExperiences: string[] | null) => {
    startTransition(() => {
      const newQueryString = createQueryString({
        experience: newExperiences?.length ? newExperiences : null,
      });
      router.push(`${pathname}?${newQueryString}`, { scroll: false });
    });
  };

  // Toggle filter value
  const toggleFilter = (currentValues: string[], value: string, updateFn: (values: string[] | null) => void) => {
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    updateFn(newValues.length > 0 ? newValues : null);
  };

  const candidateStatuses = [
    { value: "Active", label: "Active", icon: UserCheck, color: "bg-green-500" },
    { value: "Rejected", label: "Rejected", icon: UserX, color: "bg-red-500" },
    { value: "Hired", label: "Hired", icon: UserCheck, color: "bg-blue-500" },
  ];

  const commonLocations = [
    "New York", "San Francisco", "Los Angeles", "Chicago", "Austin", "Seattle", "Boston", "Remote"
  ];

  const experienceLevels = [
    "Entry Level (0-2 years)",
    "Mid Level (3-5 years)",
    "Senior Level (6-10 years)",
    "Lead Level (10+ years)"
  ];

  return (
    <div className="p-4 flex flex-col h-full space-y-6">
      {/* Quick Actions */}
      {/* <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users size={20} />
          <span className="font-medium text-base">Quick Actions</span>
        </div>
        <div className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Plus size={16} className="mr-2" />
            Add New Candidate
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Filter size={16} className="mr-2" />
            Advanced Search
          </Button>
        </div>
      </div>

      <Separator /> */}

      {/* Status Filter */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock size={20} />
          <span className="font-medium text-base">Status</span>
        </div>
        <div className="space-y-2">
          {candidateStatuses.map((status) => {
            const isSelected = statuses.includes(status.value);
            const Icon = status.icon;
            return (
              <div
                key={status.value}
                className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                  isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
                onClick={() => toggleFilter(statuses, status.value, updateStatus)}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${status.color}`}></span>
                  <Icon size={16} />
                  <span className="text-sm">{status.label}</span>
                </div>
                {isSelected && <Badge variant="secondary">✓</Badge>}
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
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {commonLocations.map((location) => {
            const isSelected = locations.includes(location);
            return (
              <div
                key={location}
                className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                  isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
                onClick={() => toggleFilter(locations, location, updateLocation)}
              >
                <span className="text-sm">{location}</span>
                {isSelected && <Badge variant="secondary">✓</Badge>}
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* CandidateDetails Filter */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users size={20} />
          <span className="font-medium text-base">Experience</span>
        </div>
        <div className="space-y-2">
          {experienceLevels.map((level) => {
            const isSelected = experiences.includes(level);
            return (
              <div
                key={level}
                className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                  isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
                onClick={() => toggleFilter(experiences, level, updateExperience)}
              >
                <span className="text-sm">{level}</span>
                {isSelected && <Badge variant="secondary">✓</Badge>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Clear Filters */}
      <div className="mt-auto">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            startTransition(() => {
              router.push(
                `${pathname}?${createQueryString({
                  status: null,
                  location: null,
                  experience: null,
                })}`,
                { scroll: false },
              );
            });
          }}
        >
          Clear All Filters
        </Button>
      </div>
    </div>
  );
};

export default CandidatesSidebar;
