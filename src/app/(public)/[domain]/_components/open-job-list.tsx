"use client";

import React, { useMemo, useState } from "react";
import { ArrowRight, Banknote, Clock, MapPin, Search } from "lucide-react";
import Link from "next/link";
import Filter from "./filter";
import { OpenJobResponseType } from "@/types";
import { formatSalaryRange } from "@/lib/format-salary-range";
import { time_ago } from "@/lib/activity-labels";

type OpenJobListProps = {
    openJobs: OpenJobResponseType[];
    activeTheme: { primaryColor: string };
};

const JOB_TYPE_LABELS: Record<string, string> = {
    FULL_TIME: "Full-time",
    PART_TIME: "Part-time",
    REMOTE: "Remote",
    INTERNSHIP: "Internship",
    CONTRACT: "Contract",
};

/**
 * Salary label for a job card. Values that parse to zero or less count as
 * absent (a stored "0" is not a real salary), so no "$0" ever renders.
 * Returns "" when the job carries no usable salary.
 */
function salaryLabel(from: string | null, upTo: string | null): string {
    const usable = (v: string | null): string | null => {
        if (v === null || v === "") return null;
        const n = Number(v);
        return Number.isNaN(n) || n <= 0 ? null : v;
    };
    return formatSalaryRange(usable(from), usable(upTo));
}

const OpenJobList = ({ openJobs, activeTheme }: OpenJobListProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [locationFilter, setLocationFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');

    const filteredJobs = openJobs.filter(job => {
        const matchesSearch = job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job?.department?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = departmentFilter === 'All' || job.department === departmentFilter;
        const matchesLoc = locationFilter === 'All' || job.location === locationFilter;
        const matchesType = typeFilter === 'All' || job.type === typeFilter;

        return matchesSearch && matchesDept && matchesLoc && matchesType;
    });

    // Group the filtered jobs by department, keeping first-appearance order.
    // Jobs with no department row land in "Other roles".
    const groups = useMemo(() => {
        const ordered: { name: string; jobs: OpenJobResponseType[] }[] = [];
        for (const job of filteredJobs) {
            const name = job.department ?? "Other roles";
            const group = ordered.find((g) => g.name === name);
            if (group) group.jobs.push(job);
            else ordered.push({ name, jobs: [job] });
        }
        return ordered;
    }, [filteredJobs]);

    return (
        <div className="space-y-10">
            <Filter
                openJobs={openJobs}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                departmentFilter={departmentFilter}
                setDepartmentFilter={setDepartmentFilter}
                locationFilter={locationFilter}
                setLocationFilter={setLocationFilter}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
            />

            {filteredJobs.length > 0 ? (
                groups.map((group) => (
                    <section key={group.name} aria-label={group.name}>
                        <div className="flex items-baseline gap-3 mb-5">
                            <h3 className="text-xl font-bold tracking-tight text-zinc-900">{group.name}</h3>
                            <span className="text-sm text-zinc-400">
                                {group.jobs.length} {group.jobs.length === 1 ? "role" : "roles"}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {group.jobs.map((job) => {
                                const salary = salaryLabel(job.salary_from, job.salary_up_to);
                                const typeLabel = job.type ? JOB_TYPE_LABELS[job.type] : null;
                                return (
                                    <Link
                                        key={job.id}
                                        href={`/apply/${job.id}`}
                                        className="group block bg-white p-6 sm:p-7 rounded-3xl border border-zinc-200 transition-all hover:border-[var(--primary-color)] hover:shadow-lg hover:shadow-zinc-900/5"
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-4">
                                            {typeLabel ? (
                                                <span
                                                    className="px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider"
                                                    style={{
                                                        backgroundColor: `${activeTheme.primaryColor}14`,
                                                        color: activeTheme.primaryColor,
                                                    }}
                                                >
                                                    {typeLabel}
                                                </span>
                                            ) : (
                                                <span />
                                            )}
                                            <span className="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
                                                <Clock className="w-3.5 h-3.5" />
                                                Posted {time_ago(new Date(job.created_at))}
                                            </span>
                                        </div>
                                        <h4 className="text-xl font-bold text-zinc-900 mb-3 group-hover:text-[var(--primary-color)] transition-colors">
                                            {job.name}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500 mb-6">
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="w-4 h-4" />
                                                {job.location}
                                            </span>
                                            {salary && (
                                                <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                                                    <Banknote className="w-4 h-4" />
                                                    {salary}
                                                    <span className="text-zinc-400 font-normal">/ year</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 pt-5 border-t border-zinc-100 text-sm font-bold" style={{ color: activeTheme.primaryColor }}>
                                            Apply now
                                            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                ))
            ) : (
                <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-zinc-300" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900">No roles found</h3>
                    <p className="text-zinc-500 mt-2">Try adjusting your search or filters to find what you&#39;re looking for.</p>
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setDepartmentFilter('All');
                            setLocationFilter('All');
                            setTypeFilter('All');
                        }}
                        className="mt-6 font-bold"
                        style={{ color: activeTheme.primaryColor }}
                    >
                        Clear all filters
                    </button>
                </div>
            )}
        </div>
    );
};

export default OpenJobList;
