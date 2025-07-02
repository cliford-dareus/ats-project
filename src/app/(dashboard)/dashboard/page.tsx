import DashboardLayout from "@/app/(dashboard)/dashboard/_components/dashboard-layout";
import {auth, currentUser} from "@clerk/nextjs/server";
import {getRangeOption, RANGE_OPTIONS} from "@/lib/utils";
import {
    get_application_chart_data_action,
    get_chart_data_action,
    get_hired_candidate_chart_data_action,
    get_open_job_chart_data_action,
} from "@/server/actions/chart-data";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import {ArrowRight} from "lucide-react";

type Props = {
    searchParams: {
        [key: string]: string | undefined;
    };
};

const Page = async ({searchParams}: Props) => {
    const {range, rangeFrom, rangeTo} = await searchParams ?? {};

    const user = await currentUser();
    const {orgId} = await auth();

    if (!orgId) return null;

    const chartRange =
        getRangeOption(range, rangeFrom, rangeTo) || RANGE_OPTIONS.last_7_days;

    const [job, hired, open_job, applications] = await Promise.all([
        get_chart_data_action(chartRange.startDate, chartRange.endDate),
        get_hired_candidate_chart_data_action(chartRange.startDate, chartRange.endDate),
        get_open_job_chart_data_action(chartRange.startDate, chartRange.endDate),
        get_application_chart_data_action(chartRange.startDate, chartRange.endDate),
    ]);

    return (
        <div className="p-4 lg:max-w-8xl 2xl:mx-auto">
            <div className="h-[150px] mt-2 rounded grid md:grid-cols-6 gap-8">
                <div className="md:col-span-4 flex flex-col justify-between gap-4 h-full flex-1">
                    <div className="mt-2">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Welcome, {user?.fullName}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {"View and manage your organization\'s dashboard"}
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 rounded p-4 bg-blue-200">
                            <Link href="" className="flex items-center gap-4">
                                <span className="text-2xl">120</span>
                                <p className="text-sm text-gray-500">
                                    Applications need to be review
                                </p>
                                <p className="text-blue-500 hover:text-blue-600">
                                    <ArrowRight size={18}/>
                                </p>
                            </Link>
                        </div>
                        <div className="border p-4 rounded col-span-1"></div>
                    </div>
                </div>

                <Card className="hidden md:block col-span-2 bg-white border border-transparent rounded">
                    <CardHeader>
                        <CardTitle>Activities</CardTitle>
                        <CardDescription>
                            Showing total visitors for the last 6 months
                        </CardDescription>
                    </CardHeader>
                    <CardContent></CardContent>
                </Card>
            </div>

            <DashboardLayout
                job_open={open_job}
                hired_candidates={hired}
                job_listings={job}
                applications={applications}
            />
        </div>
    );
};

export default Page;
