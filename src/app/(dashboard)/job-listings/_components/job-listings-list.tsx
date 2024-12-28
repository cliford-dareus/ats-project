'use client'

import {useState} from "react";
import PaginationElement from "@/components/pagination";
import {JobResponseType} from "@/types/job-listings-types";
import {Checkbox} from "@/components/ui/checkbox";
import {Ellipsis} from "lucide-react";
import {useRouter} from "next/navigation";

type Props = {
    jobs: JobResponseType[];
    pageCount: number;
}

type FieldType = {
    id: number;
    value: number[];
}

const JobListingsList = ({jobs, pageCount}: Props) => {
    const [field, setField] = useState<FieldType>();
    const router = useRouter();

    const checkIsAllChecked = () => {
        if (!field?.value || field.value.length === 0) return false;

        return field.value.every((f) => {
            const job = jobs.find((job) => job.id === f);
            return job !== undefined;
        });
    };

    return (
        <div className="p-4">
            <div className="border-b">
                <Checkbox
                    checked={checkIsAllChecked()}
                    onCheckedChange={(checked) => {
                        return !checked
                            ? setField({...field, value: []} as FieldType)
                            : setField({
                                ...field,
                                value: (jobs.map(k => k.id)) || []
                            } as FieldType)
                    }}
                />
            </div>

            <div className="flex flex-col gap-2 mt-4">
                {jobs.map(j => (
                    <div
                        onClick={() => {
                            router.push(`/job-listings/${j.id}`);
                        }}
                        className="bg-muted/50 shadow flex items-center p-4 rounded gap-4 justify-between hover:bg-muted cursor-pointer"
                        key={j.id}>
                        <div className="flex items-center gap-4">
                            <Checkbox
                                checked={field?.value.includes(j.id)}
                                onCheckedChange={(checked) => {
                                    return checked
                                        ? setField({...field, value: [...(field?.value ?? []), j.id]} as FieldType)
                                        : setField({
                                            ...field,
                                            value: (field?.value ?? []).filter((value) => value !== j.id) || []
                                        } as FieldType)
                                }}
                            />
                            <span className="font-medium truncate min-w-[150px]">{j.name}</span>
                        </div>

                        <span className="truncate min-w-[100px]">{j.location}</span>
                        <span>{j.candidatesCount}</span>
                        <span className="hidden md:block">{j.created_at.toLocaleDateString()}</span>

                        <div className="flex items-center gap-2">
                            <Ellipsis size={20}/>
                        </div>
                    </div>
                ))}
            </div>

            <PaginationElement pageCount={pageCount}/>
        </div>
    );
};

export default JobListingsList;