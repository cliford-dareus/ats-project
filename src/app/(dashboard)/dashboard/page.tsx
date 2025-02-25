import DashboardLayout from "@/app/(dashboard)/dashboard/_components/dashboard-layout";
import {auth} from "@clerk/nextjs/server";
import {getRangeOption, RANGE_OPTIONS} from "@/lib/utils";
import {
    get_application_chart_data_action, get_chart_data_action,
    get_hired_candidate_chart_data_action,
    get_open_job_chart_data_action
} from "@/server/actions/chart-data";

type Props = {
    searchParams: {
        [key: string]: string | undefined;
    }
};

const Page = async ({searchParams}: Props) => {
    const {range, rangeFrom, rangeTo} = await searchParams ?? {};

    const {orgId} = await auth();
    if (!orgId) return null;

    const chartRange = getRangeOption(range, rangeFrom, rangeTo) || RANGE_OPTIONS.last_7_days;

    const [job, hired, open_job, applications] = await Promise.all([
        get_chart_data_action(chartRange.startDate, chartRange.endDate),
        get_hired_candidate_chart_data_action(chartRange.startDate, chartRange.endDate),
        get_open_job_chart_data_action(chartRange.startDate, chartRange.endDate),
        get_application_chart_data_action(chartRange.startDate, chartRange.endDate),
    ]);

    console.log(job)

    return (
        <DashboardLayout
            job_open={open_job}
            hired_candidates={hired}
            job_listings={job}
            organization={orgId as string}
            applications={applications}
        />
    )
};

export default Page;