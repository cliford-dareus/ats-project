'use client'

import React, { useEffect } from 'react';
import {Button} from "@/components/ui/button";
import {useRouter} from "next/navigation";
import {JobResponseType} from "@/types";
import {DialogTitle} from "@/components/ui/dialog";

type Props = {
    data: JobResponseType;
    jobs: JobResponseType[];
};

const JobPreview = ({data, jobs}: Props) => {
    const router = useRouter();
    return (
        <div className="p-4">
            <DialogTitle>JOB PREVIEW</DialogTitle>
            <div>
                <Button onClick={() => {
                    router.push(`/jobs/${data.id}`);
                }}>View Job Page</Button>

                {JSON.stringify(data, null, 2)}
                {JSON.stringify(jobs, null, 2)}
            </div>
        </div>

    );
};

export default JobPreview;
