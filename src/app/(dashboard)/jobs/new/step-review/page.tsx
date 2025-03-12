"use client"

import React from 'react';
import {z} from "zod";
import {formSchema} from "@/zod";
import {create_job_action} from "@/server/actions/job-listings-actions";
import {useNewJobContext} from "@/providers/new-job-provider";
import {Button} from "@/components/ui/button";

const Page = () => {
    const {newJobData} = useNewJobContext();

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        try {
            const job = await create_job_action(data);
            if (!job) {
                console.log(job)
            }
        } catch (err) {
            console.log(err)
        }
    };

    return (
        <div >
            <div className="flex flex-col items-center mb-8 mt-4">
                <h1 className="text-slate-500">Review</h1>
                <p className="text-2xl font-semibold leading-7">Review your job listing</p>
            </div>

            <div className="flex flex-col mt-4">
                <div>
                    <h2 className="text-slate-500">Job Information</h2>
                    <div className="border w-full rounded p-4">

                    </div>
                </div>

                <div>
                    <h2 className="text-slate-500">Experience</h2>
                    <div className="border w-full rounded p-4">

                    </div>
                </div>

                <div>
                    <h2 className="text-slate-500">Workflow</h2>
                    <div className="border w-full rounded p-4">

                    </div>
                </div>
            </div>

            <Button onClick={() => onSubmit(newJobData)}></Button>
        </div>
    );
};

export default Page;