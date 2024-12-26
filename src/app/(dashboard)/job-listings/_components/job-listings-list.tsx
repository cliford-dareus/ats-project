import PaginationElement from "@/components/pagination";
import type { JobListingType } from "@/drizzle/schema";

type Props = {
    jobs: any;
    pageCount: number;
}

const JobListingsList = ({jobs, pageCount}: Props) => {
    return (
        <div className="">
            {jobs.map(j => (
                <div key={j.id}>
                    <h1>{j.name}</h1>
                    <p>{j.location}</p>
                </div>
            ))}

            <PaginationElement pageCount={pageCount}/>
        </div>
    );
};

export default JobListingsList;