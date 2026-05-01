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
        {
            id: "experience",
            title: "Experience",
            icon: Zap,
            items: [
                {value: "ENTRY", label: "Entry (0-2 years)", icon: UserCheck, color: "bg-green-500"},
                {value: "MID", label: "Mid (3-5 years)", icon: UserX, color: "bg-red-500"},
                {value: "SENIOR", label: "Senior (6-10 years)", icon: UserCheck, color: "bg-blue-500"},
                {value: "LEAD", label: "Lead (10+ years)", icon: UserCheck, color: "bg-yellow-500"},
            ],
        },

    ]

    return (
        <aside>
            <AppSidebarFilter config={config}/>
        </aside>
    );
};

export default CandidatesSidebar;
