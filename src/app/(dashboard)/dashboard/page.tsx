import Dashboard from "@/app/(dashboard)/dashboard/_components/dashboard";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getRangeOption, RANGE_OPTIONS } from "@/lib/utils";
import {
    getDashboardMetrics,
    getRecentActivity,
    getUpcomingInterviews,
    getJobPipelineData,
    getRecruitmentFunnel, getApplicationTrends
} from "@/server/actions/dashboard-actions";

type Props = {
    searchParams: {
        [key: string]: string | undefined;
    };
};

const Page = async ({ searchParams }: Props) => {
    const { range, rangeFrom, rangeTo } = searchParams ?? {};
    const user = await currentUser();
    const { orgId } = await auth();

    if (!orgId || !user) return null;

    const chartRange =
        getRangeOption(range, rangeFrom, rangeTo) || RANGE_OPTIONS.last_7_days;

    // Fetch dashboard data
    const [metrics, recentActivity, upcomingInterviews, jobPipeline, recruitmentFunnel, applicationTrend] = await Promise.all([
        getDashboardMetrics(),
        getRecentActivity(),
        getUpcomingInterviews(),
        getJobPipelineData(),
        getRecruitmentFunnel(),
        getApplicationTrends()
    ]);

    return (
        <div className="min-h-screen bg-gray-50/50 w-full">
            <Dashboard
                metrics={metrics}
                recentActivity={recentActivity}
                upcomingInterviews={upcomingInterviews}
                jobPipeline={jobPipeline}
                recruitmentFunnel={recruitmentFunnel}
                applicationTrend={applicationTrend}
                userName={user?.fullName || 'User'}
            />
        </div>
    );
};

export default Page;
