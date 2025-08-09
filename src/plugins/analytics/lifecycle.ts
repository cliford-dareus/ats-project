import { get_application_chart_data_action, get_chart_data_action, get_hired_candidate_chart_data_action, get_open_job_chart_data_action } from "@/server/actions/chart-data";

export const lifecycle = {
    activate: async (context) => {
        const [job, hired, open_job, applications] = await Promise.all([
            get_chart_data_action(context.chartRange.startDate, context.chartRange.endDate),
            get_hired_candidate_chart_data_action(context.chartRange.startDate, context.chartRange.endDate),
            get_open_job_chart_data_action(context.chartRange.startDate, context.chartRange.endDate),
            get_application_chart_data_action(context.chartRange.startDate, context.chartRange.endDate),
        ]);

        context.setAnalytics({job, hired, open_job, applications});
        console.log("Activating TinyBird plugin", context);
    },

    deactivate: (context) => {
        console.log("Deactivating TinyBird plugin", context);
    },

    getChartData: async (context, startDate, endDate) => {
        const [job, hired, open_job, applications] = await Promise.all([
            get_chart_data_action(startDate, endDate),
            get_hired_candidate_chart_data_action(startDate, endDate),
            get_open_job_chart_data_action(startDate, endDate),
            get_application_chart_data_action(startDate, endDate),
        ]);

        context.setAnalytics({job, hired, open_job, applications});
    },

    getOpenJobChartData: async (context) => {
        console.log("Getting open job chart data", context);
    },

    getApplicationChartData: async (context) => {
        console.log("Getting application chart data", context);
    },
}
