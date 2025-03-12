import React from 'react';
import {useRouter} from "next/navigation";
import {DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {CandidatesResponseType} from "@/types";

type Props = {
    data: CandidatesResponseType;
    candidates: CandidatesResponseType[];
};

const CandidatePreview = ({data, candidates}: Props) => {
    const router = useRouter();

    return (
        <div className="p-4">
            <DialogTitle>CANDIDATE PREVIEW</DialogTitle>
            <div>
                <Button onClick={() => {
                    router.push(`/candidates/${data.id}`);
                }}>View Job Page</Button>

                {JSON.stringify(data, null, 2)}
                {JSON.stringify(candidates, null, 2)}
            </div>
        </div>

    );
};

export default CandidatePreview;