import { auth } from "@clerk/nextjs/server"
import { getApplicationChartData, getCandidateChartData, getChartData, getHiredCandidateChartData, getInterviewChartData, getOpenJobChartData } from "../db/chart-data"

export const get_chart_data_action = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const { userId } = await auth()

    if (userId == null) return null
    return await getChartData(createdAfter, createdBefore)
};

export const get_open_job_chart_data_action = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const { userId } = await auth()

    if (userId == null) return null
    return await getOpenJobChartData(createdAfter, createdBefore)
};

export const get_application_chart_data_action = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const { userId } = await auth()

    if (userId == null) return null
    return await getApplicationChartData(createdAfter, createdBefore)
};

export const get_interview_chart_data_action = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const { userId } = await auth()

    if (userId == null) return null
    return await getInterviewChartData(createdAfter, createdBefore)
};

export const get_candidate_chart_data_action = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const { userId } = await auth()

    if (userId == null) return null
    return await getCandidateChartData(createdAfter, createdBefore)
};

export const get_hired_candidate_chart_data_action = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const { userId } = await auth()

    if (userId == null) return null
    return await getHiredCandidateChartData(createdAfter, createdBefore)
};
