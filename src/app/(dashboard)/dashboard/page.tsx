import DashboardLayout from "@/app/(dashboard)/dashboard/_components/dashboard-layout";
import {auth} from "@clerk/nextjs/server";
import {
    get_hired_candidate_chart_data_db,
    get_job_chart_data_db,
    get_open_job_chart_data_db
} from "@/server/db/chart-data";
import {RANGE_OPTIONS} from "@/lib/utils";

const Page = async () => {
    const {orgId} = await auth();
    if (!orgId) return null;

    // TODO: Add searchParams range logic for dynamic range selection
    const [job, hired, open_job] = await Promise.all([
        get_job_chart_data_db(RANGE_OPTIONS.last_7_days.startDate, RANGE_OPTIONS.last_7_days.endDate),
        get_hired_candidate_chart_data_db(RANGE_OPTIONS.last_7_days.startDate, RANGE_OPTIONS.last_7_days.endDate),
        get_open_job_chart_data_db(RANGE_OPTIONS.last_7_days.startDate, RANGE_OPTIONS.last_7_days.endDate)
    ])

    console.log(job, hired, open_job);

    return (
        <DashboardLayout
            organization={orgId as string}
        />
    )
};

export default Page;