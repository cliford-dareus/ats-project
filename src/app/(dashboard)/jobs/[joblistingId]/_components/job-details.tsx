import React from 'react';
import {JobListingWithCandidatesType, StageResponseType} from "@/types/job-listings-types";

type Props = {
    data: JobListingWithCandidatesType[];
    stages: StageResponseType[]
};

const JobDetails = ({data, stages}: Props) => {
    return (
        <div className="p-4 overflow-hidden h-[calc(100vh-200px)]">
            Details
        </div>
    );
};

export default JobDetails;