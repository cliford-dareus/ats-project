"use server";

import {auth} from "@clerk/nextjs/server"
import {
    getApplicationChartData,
    getCandidateChartData,
    getChartData,
    getHiredCandidateChartData,
    getInterviewChartData,
    getOpenJobChartData
} from "@/server/queries/drizzle/chart-data"
import {getChartDateArray} from "@/lib/utils";
import {startOfDay} from "date-fns";

// TODO: BE DRYER
export const get_chart_data_action = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const {userId} = await auth()
    if (userId == null) return null

    const result = await getChartData(createdAfter, createdBefore)
    const {array, format} = getChartDateArray(createdAfter || startOfDay(result[0].date as string),
        createdBefore || new Date())

    const dayArray = array.map(date => {
        return {
            date: format(date),
            count: 0,
        }
    })

    return result.reduce((data, order) => {
        const formattedDate = format(new Date(order.date as string))
        const entry = dayArray.find(day => day.date === formattedDate)
        if (entry == null) return data
        entry.count += order.count as number
        return data
    }, dayArray)
};

export const get_open_job_chart_data_action = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const {userId} = await auth()
    if (userId == null) return null

    const result = await getOpenJobChartData(createdAfter, createdBefore)
    const {array, format} = getChartDateArray(createdAfter || startOfDay(result[0].date as string),
        createdBefore || new Date())

    const dayArray = array.map(date => {
        return {
            date: format(date),
            count: 0,
        }
    })

    return result.reduce((data, order) => {
        const formattedDate = format(new Date(order.date as string))
        const entry = dayArray.find(day => day.date === formattedDate)
        if (entry == null) return data
        entry.count += order.count as number
        return data
    }, dayArray)
};

export const get_application_chart_data_action = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const {userId} = await auth()

    if (userId == null) return null
    const result = await getApplicationChartData(createdAfter, createdBefore)
    const {array, format} = getChartDateArray(createdAfter || startOfDay(result[0].date as string),
        createdBefore || new Date())

    const dayArray = array.map(date => {
        return {
            date: format(date),
            count: 0,
        }
    })

    return result.reduce((data, order) => {
        const formattedDate = format(new Date(order.date as string))
        const entry = dayArray.find(day => day.date === formattedDate)
        if (entry == null) return data
        entry.count += order.count as number
        return data
    }, dayArray)
};

export const get_interview_chart_data_action = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const {userId} = await auth()

    if (userId == null) return null
    return await getInterviewChartData(createdAfter, createdBefore)
};

export const get_candidate_chart_data_action = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const {userId} = await auth()

    if (userId == null) return null
    return await getCandidateChartData(createdAfter, createdBefore)
};

export const get_hired_candidate_chart_data_action = async (createdAfter: Date | null, createdBefore: Date | null) => {
    const {userId} = await auth();

    if (userId == null) return null
    const result = await getHiredCandidateChartData(createdAfter, createdBefore)

    const {array, format} = getChartDateArray(createdAfter || startOfDay(result[0].date as string),
        createdBefore || new Date())

    const dayArray = array.map(date => {
        return {
            date: format(date),
            count: 0,
        }
    })

    return result.reduce((data, order) => {
        const formattedDate = format(new Date(order.date as string))
        const entry = dayArray.find(day => day.date === formattedDate)
        if (entry == null) return data
        entry.count += order.count as number
        return data
    }, dayArray)
};
