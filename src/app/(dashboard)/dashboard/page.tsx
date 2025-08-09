import Dashboard from "@/app/(dashboard)/dashboard/_components/dashboard";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getRangeOption, RANGE_OPTIONS } from "@/lib/utils";
import {
    getDashboardMetrics,
    getRecentActivity,
    getUpcomingInterviews,
    getJobPipelineData
} from "@/server/actions/dashboard-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
    searchParams: {
        [key: string]: string | undefined;
    };
};

const Page = async ({ searchParams }: Props) => {
    const { range, rangeFrom, rangeTo, view } = searchParams ?? {};

    const user = await currentUser();
    const { orgId } = await auth();

    if (!orgId) return null;

    const chartRange =
        getRangeOption(range, rangeFrom, rangeTo) || RANGE_OPTIONS.last_7_days;

    // Fetch dashboard data
    const [metrics, recentActivity, upcomingInterviews, jobPipeline] = await Promise.all([
        getDashboardMetrics(),
        getRecentActivity(),
        getUpcomingInterviews(),
        getJobPipelineData()
    ]);

    const currentView = view || 'modern';

    return (
        <div className="min-h-screen bg-gray-50/50">
            <Dashboard
                metrics={metrics}
                recentActivity={recentActivity}
                upcomingInterviews={upcomingInterviews}
                jobPipeline={jobPipeline}
                userName={user?.fullName || 'User'}
            />
        </div>
    );
};

export default Page;
