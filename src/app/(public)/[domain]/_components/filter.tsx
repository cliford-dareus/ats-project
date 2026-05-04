"use client";

import React from "react";
import { Search } from "lucide-react";

const Filter = ({ openJobs, searchQuery, setSearchQuery, departmentFilter, setDepartmentFilter, locationFilter, setLocationFilter, typeFilter, setTypeFilter, activeTheme }) => {
    const departments = ['All', ...new Set(openJobs.map(j => j.department))];
    const locations = ['All', ...new Set(openJobs.map(j => j.location))];
    const types = ['All', ...new Set(openJobs.map(j => j.type))];

    return (
        <div className="bg-white p-6 rounded-[32px] border border-zinc-200 shadow-sm space-y-4">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                    type="text"
                    placeholder="Search for your next role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:border-zinc-400 transition-all"
                    style={{ '--tw-ring-color': `${activeTheme.primaryColor}33` } as React.CSSProperties}
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-400 transition-all"
                    style={{ '--tw-ring-color': `${activeTheme.primaryColor}33` } as React.CSSProperties}
                >
                    <option value="All">All Departments</option>
                    {departments.filter(d => d !== 'All').map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-400 transition-all"
                    style={{ '--tw-ring-color': `${activeTheme.primaryColor}33` } as React.CSSProperties}
                >
                    <option value="All">All Locations</option>
                    {locations.filter(l => l !== 'All').map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-400 transition-all"
                    style={{ '--tw-ring-color': `${activeTheme.primaryColor}33` } as React.CSSProperties}
                >
                    <option value="All">All Job Types</option>
                    {types.filter(t => t !== 'All').map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
        </div>
    );
};

export default Filter;
