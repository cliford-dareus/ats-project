import Dashboard from "@/app/(dashboard)/dashboard/_components/dashboard";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
    getDashboardMetrics,
    getUpcomingInterviews,
    getJobPipelineData,
    getRecruitmentFunnel,
    getApplicationTrends,
    getAttentionStats,
    parse_trend_range
} from "@/server/actions/dashboard-actions";
import { get_activity_log_action } from "@/server/actions/activity-actions";
import type { ActivityLogEntry } from "@/server/queries/drizzle/activity";

type Props = {
    searchParams: Promise<{
        [key: string]: string | string[] | undefined;
    }>;
};

const Page = async ({ searchParams }: Props) => {
    const user = await currentUser();
    const { orgId } = await auth();

    if (!orgId || !user) return null;

    const params = await searchParams;
    const range = parse_trend_range(
        typeof params.range === "string" ? params.range : undefined
    );

    // Recent Activity reads the real activity_log now (it used to be
    // derived from recent rows, so deletes and stage moves never showed).
    // A permission failure must not take the whole dashboard down, so a
    // denied read falls back to an empty list.
    const recentActivity: ActivityLogEntry[] = await get_activity_log_action({ limit: 5, offset: 0 })
        .then((result) => result.entries)
        .catch(() => []);

    // Fetch dashboard data
    const [metrics, upcomingInterviews, jobPipeline, recruitmentFunnel, applicationTrend, attention] = await Promise.all([
        getDashboardMetrics(),
        getUpcomingInterviews(),
        getJobPipelineData(),
        getRecruitmentFunnel(),
        getApplicationTrends(range),
        getAttentionStats()
    ]);

    return (
        <Dashboard
            metrics={metrics}
            recentActivity={recentActivity}
            upcomingInterviews={upcomingInterviews}
            jobPipeline={jobPipeline}
            recruitmentFunnel={recruitmentFunnel}
            applicationTrend={applicationTrend}
            trendRange={range}
            attention={attention}
            userName={user?.fullName || 'User'}
        />
    );
};

export default Page;
