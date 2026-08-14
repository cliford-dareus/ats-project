"use client";

import { cn } from "@/lib/utils";
import { Building2, Download } from "lucide-react";
import { useState } from "react";

const ReportHeader = () => {
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

    return (
        <div className="flex items-center gap-3 justify-between">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-zinc-900 tracking-widder uppercase">Recruitment Analytics & Reports</h1>
                    <span className="px-2.5 py-0.5 bg-brand-50 border border-brand-200/80 text-brand-700 font-bold text-[11px] rounded-full uppercase tracking-wider">
                        Live Intelligence
                    </span>
                </div>
                <p className="text-xs text-zinc-500 font-medium mt-1">
                    Track hiring velocity, pipeline conversion rates, sourcing performance, and recruitment ROI.
                </p>
            </div>

            {/* Global Controls & Filters */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Department Dropdown */}
                <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-2xl px-3 py-1.5 shadow-sm">
                    <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                    {/*<select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="bg-transparent text-xs font-bold text-zinc-700 focus:outline-none cursor-pointer"
                    >
                        {departments.map((dept) => (
                            <option key={dept} value={dept}>{dept} Department</option>
                        ))}
                    </select>*/}
                </div>

                {/* Time Range Filter Buttons */}
                <div className="bg-white border border-zinc-200 p-1 rounded-2xl flex items-center gap-1 shadow-sm">
                    {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={cn(
                                "px-3 py-1 rounded-xl text-xs font-bold transition-all uppercase",
                                timeRange === range
                                    ? "bg-zinc-900 text-white shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-900"
                            )}
                        >
                            {range}
                        </button>
                    ))}
                </div>

                {/* Export Report Action */}
                <button
                    // onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-xs font-bold transition-all shadow-sm"
                >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV Report
                </button>
            </div>
        </div>
    );
};

export default ReportHeader;
