import DashboardLayout from "@/app/(dashboard)/dashboard/_components/dashboard-layout";
import {auth} from "@clerk/nextjs/server";
import {RANGE_OPTIONS} from "@/lib/utils";
import {
    get_application_chart_data_action, get_chart_data_action,
    get_hired_candidate_chart_data_action,
    get_open_job_chart_data_action
} from "@/server/actions/chart-data";

const Page = async () => {
    const {orgId} = await auth();
    if (!orgId) return null;

    // TODO: Add searchParams range logic for dynamic range selection
    const [job, hired, open_job, applications] = await Promise.all([
        get_chart_data_action(RANGE_OPTIONS.last_7_days.startDate, RANGE_OPTIONS.last_7_days.endDate),
        get_hired_candidate_chart_data_action(RANGE_OPTIONS.all_time.startDate, RANGE_OPTIONS.all_time.endDate),
        get_open_job_chart_data_action(RANGE_OPTIONS.last_7_days.startDate, RANGE_OPTIONS.last_7_days.endDate),
        get_application_chart_data_action(RANGE_OPTIONS.last_7_days.startDate, RANGE_OPTIONS.last_7_days.endDate),
    ]);

    // console.log("JOBS", job, "HIRED",hired, "OPEN",open_job,"APPLICATION", applications);

    return (
        <DashboardLayout
            job_open={open_job}
            hired_candidates={hired}
            job_listings={job}
            organization={orgId as string}
        />
    )
};

export default Page;