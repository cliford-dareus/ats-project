import React from 'react';
import {DrawerClose, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle} from "@/components/ui/drawer";
import {Button} from "@/components/ui/button";
import {ApplicationResponseType} from "@/types/job-listings-types";
import {Badge} from "@/components/ui/badge";

type Props = {
    data: ApplicationResponseType
}

const CandidatePreview = ({data}: Props) => {
    return (
        <>
            <DrawerHeader>
                <div className="flex items-center gap-4">
                    <DrawerTitle className="text-2xl">{data.candidate_name}</DrawerTitle>
                    <Badge>{data.candidate_status}</Badge>
                </div>
                <DrawerDescription>

                </DrawerDescription>
            </DrawerHeader>

            <DrawerFooter>
                <Button>Submit</Button>
                <DrawerClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DrawerClose>
            </DrawerFooter>
        </>
    );
};

export default CandidatePreview;