"use client";

import React from "react";
import {

    UserCheck,
    UserX,
    Zap,
} from "lucide-react";
import AppSidebarFilter from "@/components/sidebar/app-sidebar-filter";

const CandidatesSidebar = () => {
    const config = [
        {
            id: "status",
            title: "Status",
            icon: Zap,
            items: [
                {value: "ACTIVE", label: "Active", icon: UserCheck, color: "bg-green-500"},
                {value: "REJECTED", label: "Rejected", icon: UserX, color: "bg-red-500"},
                {value: "HIRED", label: "Hired", icon: UserCheck, color: "bg-blue-500"},
            ],
        },
        // No Experience group: the candidates table has no `experience`
        // column, so the filter was a silent no-op.
    ]

    return (
        <aside>
            <AppSidebarFilter config={config}/>
        </aside>
    );
};

export default CandidatesSidebar;
