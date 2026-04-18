"use client";

import React, {useCallback, useTransition} from "react";
import {
    Users,
    MapPin,
    Plus,
    Filter,
    UserCheck,
    UserX,
    Clock,
    Zap,
    CheckCircle,
    Eye,
    XCircle,
    Archive
} from "lucide-react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Separator} from "@/components/ui/separator";
import {createNewSearchParam} from "@/lib/utils";
import AppSidebarFilter from "@/components/app-sidebar-filter";

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
