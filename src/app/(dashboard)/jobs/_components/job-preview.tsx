'use client'

import React from 'react';
import {Button} from "@/components/ui/button";
import {useRouter} from "next/navigation";
import {JobResponseType} from "@/types/job-listings-types";
import {DialogTitle} from "@/components/ui/dialog";

type Props = {
    data: JobResponseType;
};

const JobPreview = ({data}: Props) => {
    const router = useRouter();

    return (
        <div className="p-4">
            <DialogTitle>JOB PREVIEW</DialogTitle>
            <div>
                <Button onClick={() => {
                    router.push(`/jobs/${data.id}`);
                }}>View Job Page</Button>

            </div>
        </div>

    );
};

export default JobPreview;