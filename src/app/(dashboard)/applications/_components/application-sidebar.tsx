import React from "react";
import AppSidebarFilter from "@/components/app-sidebar-filter";
import {Archive, Building2, CheckCircle, Clock, Eye, XCircle, Zap} from "lucide-react";
import {DEPARTMENTS} from "@/lib/constant";

const ApplicationsSidebar = () => {
    const config = [
        {
            id: "status",
            title: "Status",
            icon: Zap,
            items: [
                { value: "APPLIED", label: "Applied", icon: CheckCircle, color: "bg-green-500", count: 12 },
                { value: "NEW CANDIDATE", label: "Pending", icon: Clock, color: "bg-yellow-500", count: 5 },
                { value: "SCREENING", label: "Screening", icon: Eye, color: "bg-blue-500", count: 3 },
                { value: "PHONE INTERVIEW", label: "Phone Interview", icon: XCircle, color: "bg-red-500", count: 8 },
                { value: "INTERVIEW", label: "Interview", icon: Archive, color: "bg-gray-500", count: 2 },
            ],
        },
        {
            id: "department",
            title: "Department",
            icon: Building2,
            items: DEPARTMENTS,
        }
    ];

    return (
        <aside className="flex flex-col bg-white flex-shrink-0 h-[calc(100vh-135px)]">
          <AppSidebarFilter config={config} />
        </aside>
    );
};

export default ApplicationsSidebar;
