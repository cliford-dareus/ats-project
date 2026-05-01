import React from "react";
import {
    Building2,
    Clock,
    CheckCircle,
    XCircle,
    Archive,
    Eye,
    Zap,
} from "lucide-react";
import { DEPARTMENTS } from "@/lib/constant";
import AppSidebarFilter from "@/components/sidebar/app-sidebar-filter";

const JobListingSidebar = () => {
    const config = [
        {
            id: "status",
            title: "Status",
            icon: Zap,
            items: [
                { value: "OPEN", label: "Open", icon: CheckCircle, color: "bg-green-500" },
                { value: "PENDING", label: "Pending", icon: Clock, color: "bg-yellow-500"},
                { value: "DRAFT", label: "Draft", icon: Eye, color: "bg-blue-500"},
                { value: "CLOSED", label: "Closed", icon: XCircle, color: "bg-red-500"},
                { value: "ARCHIVED", label: "Archived", icon: Archive, color: "bg-gray-500"},
            ],
        },
        {
            id: "type",
            title: "Type",
            icon: Clock,
            items: [
                { value: "FULL_TIME", label: "Full Time", icon: CheckCircle, color: "bg-green-500" },
                { value: "PART_TIME", label: "Part Time", icon: CheckCircle, color: "bg-green-500" },
                { value: "REMOTE", label: "Remote", icon: CheckCircle, color: "bg-green-500" },
                { value: "INTERNSHIP", label: "Internship", icon: CheckCircle, color: "bg-green-500" },
                { value: "CONTRACT", label: "Contract", icon: CheckCircle, color: "bg-green-500" },
            ],
        },
        {
            id: "department",
            title: "Department",
            icon: Building2,
            items: DEPARTMENTS as string[],
        }
    ];

    return (
        <aside className="flex flex-col bg-white flex-shrink-0 h-[calc(100vh-135px)]">
          <AppSidebarFilter config={config}/>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/30">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Active Jobs</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-slate-900">42</span>
                            <span className="text-[10px] font-bold text-emerald-500">+3</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Candidates</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-slate-900">1.2k</span>
                            <span className="text-[10px] font-bold text-blue-500">+12</span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default JobListingSidebar;
