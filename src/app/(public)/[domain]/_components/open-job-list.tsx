"use client";

import React, { useState, useTransition } from "react";
import { ArrowRight, Briefcase, Clock, MapPin, Search } from "lucide-react";
import Filter from "./filter";
import { useRouter } from "next/navigation";

const OpenJobList = ({ openJobs, activeTheme }: { openJobs: any[]; activeTheme: any }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [locationFilter, setLocationFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [, startTransition] = useTransition();
    const router = useRouter();

    const filteredJobs = openJobs.filter(job => {
        const matchesSearch = job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.department.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = departmentFilter === 'All' || job.department === departmentFilter;
        const matchesLoc = locationFilter === 'All' || job.location === locationFilter;
        const matchesType = typeFilter === 'All' || job.type === typeFilter;

        return matchesSearch && matchesDept && matchesLoc && matchesType;
    });

    return (
        <div className="space-y-4">
            <Filter
                activeTheme={activeTheme}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {filteredJobs.length > 0 ? (
                    filteredJobs.map((job) => (
                        <div
                            key={job.id}
                            className="bg-white p-8 rounded-[32px] border border-zinc-200 hover:border-brand-500 transition-all group cursor-pointer shadow-sm hover:shadow-xl hover:shadow-brand-500/5"
                            onClick={() => startTransition(() => {
                                router.push(`/apply/${job.id}`);
                            })}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-zinc-50 rounded-2xl group-hover:bg-brand-50 transition-colors">
                                    <Briefcase className="w-6 h-6 text-zinc-400 group-hover:text-brand-600" />
                                </div>
                                <span className="px-3 py-1 bg-zinc-100 text-zinc-500 text-[10px] font-bold rounded-full uppercase tracking-widest">
                                    {job.type}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-zinc-900 mb-2">{job.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-zinc-500 mb-8">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4" />
                                    {job.location}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    {job.department}
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-6 border-t border-zinc-50">
                                <span className="font-bold text-sm" >Apply Now</span>
                                <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-zinc-300" />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900">No roles found</h3>
                        <p className="text-zinc-500 mt-2">Try adjusting your search or filters to find what you're looking for.</p>
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
        </div>
    );
};

export default OpenJobList;
