import React from 'react';
import {get_all_job_listings} from "@/server/db/job-listings";

const Page = async () => {
    const jobs = await get_all_job_listings()

    return (
        <div>
            <div>
                {jobs.map(j => (
                    <div key={j.id}>
                        <h1>{j.name}</h1>
                        <p>{j.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Page;