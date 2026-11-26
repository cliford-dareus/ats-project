"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScheduleInterviewModal from "@/components/modal/schedule-interview-modal";

type Props = {
    /** The get_application_by_id row (not an ApplicationResponseType — it
     * has no assign_to; the modal only reads id / job_id / candidate
     * name & email from it). */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    application: any;
    jobName: string;
    department: string;
    label?: string;
    variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
};

/** Reusable "Schedule Interview" trigger + modal. Refreshes the page when
 * the modal closes so a newly scheduled interview shows up. */
const ScheduleInterviewButton = ({
    application,
    jobName,
    department,
    label = "Schedule Interview",
    variant = "default",
    size = "default",
    className,
}: Props) => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const wasOpen = useRef(false);

    useEffect(() => {
        if (wasOpen.current && !isOpen) router.refresh();
        wasOpen.current = isOpen;
    }, [isOpen, router]);

    return (
        <>
            <Button variant={variant} size={size} className={className} onClick={() => setIsOpen(true)}>
                {label === "Schedule First Interview" ? (
                    <Plus size={16} className="mr-2" />
                ) : (
                    <Calendar size={16} className="mr-2" />
                )}
                {label}
            </Button>
            <ScheduleInterviewModal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                application={application}
                jobDetails={{ jobName, department }}
            />
        </>
    );
};

export default ScheduleInterviewButton;
