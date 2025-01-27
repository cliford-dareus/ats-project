'use client'

import React from 'react';
import {Button} from "@/components/ui/button";
import {useRouter} from "next/navigation";
import {JobResponseType} from "@/types/job-listings-types";

type Props = {
    data: JobResponseType;
};

const JobPreview = ({data}: Props) => {
    const router = useRouter();

    return (
        <div className="p-4">
            <Button onClick={() => {
                router.push(`/jobs/${data.id}`);
            }}>View Job Page</Button>
        </div>
    );
};

export default JobPreview;