import {clsx, type ClassValue} from "clsx"
import {twMerge} from "tailwind-merge"
import {UseFormReturn} from "react-hook-form";
import {ApplicationResponseType, CandidateExperience, CandidatesResponseType, JobExperience} from "@/types";
import {
    differenceInDays, differenceInMonths,
    differenceInWeeks,
    eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, eachYearOfInterval, endOfWeek,
    interval, isValid, max, min,
    startOfDay, startOfWeek,
    subDays,
} from "date-fns";
import { MatchResult } from "@/app/(dashboard)/applications/[applicationId]/_components/application-summary";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
};

export const checkFormStatus = <U, T extends UseFormReturn<any>>(args: U, form: T, trigger: U) => {
    const object = form.getValues();

    if (args === trigger) {
        const jobTech = object.trigger;

        if (!Array.isArray(jobTech)) {
            const jobTech_ = object[trigger] as { [key: string]: string };
            if (Array.isArray(jobTech_)) {
                return jobTech_.length >= 3;
            }
            return Object.keys(jobTech_).every(s => jobTech_[s] !== '')
        }
    }
};

export const aggregateByKey = <T extends Record<string, unknown>>(
    data: T[],
    key: keyof T,
    countKey: keyof T,
    color?: keyof T,
): { [key: string]: number | string }[] => {
    return data?.reduce((acc, cur) => {
        if (cur[key] === null) {
            return acc; // Skip if the key is null
        }

        const existingItem = acc.find(item => item[key as string] === cur[key]);
        if (existingItem) {
            existingItem[countKey as string] = (existingItem[countKey as string] as number) + (cur[countKey] as number);
        } else {
            acc.push({
                [key]: cur[key] as string | number,
                [countKey]: cur[countKey] as number,
                ...(color ? { [color]: cur[color] as string | number } : {})
            });
        }

        return acc;
    }, [] as { [key: string]: number | string }[]);
};

export const getTimeElapsed = (date: Date) => {
    const then = new Date(date);
    const now = new Date();

    const diff = now.getTime() - then.getTime();
    return Math.floor(diff / (1000 * 3600 * 24));
};

export const createNewSearchParam = (params: Record<string, string | string[] | number | null>, searchParams: URLSearchParams) => {
    const newSearchParams = new URLSearchParams(searchParams?.toString());

    for (const [key, value] of Object.entries(params)) {
        if (value === null || (Array.isArray(value) && value.length == 0)) {
            newSearchParams.delete(key);
        } else {
            newSearchParams.set(key, String(value));
        }
    }
    return newSearchParams.toString();
};

// export const groupedByMonths = (data: CandidatesResponseType [] | ApplicationResponseType[], interval: number) => {
//     let index = 0;

//     const monthYearFormatter = new Intl.DateTimeFormat("en-US", {month: "long", year: "numeric"});
//     const now = new Date();
//     const intervalAgo = new Date();
//     intervalAgo.setMonth(now.getMonth() - interval);

//     return data.reduce((acc, curr) => {
//         const createdAt = new Date(curr.created_at);
//         const date = monthYearFormatter.format(createdAt);

//         if (createdAt >= intervalAgo) {
//             if (!acc[date]) {
//                 acc[date] = {
//                     date,
//                     count: 1,
//                     fill: chartData[index].fill,
//                 };
//                 index++;
//             } else {
//                 acc[date].count++;
//             }
//         } else {
//             if (!acc["Older"]) {
//                 acc["Older"] = {
//                     date: "older",
//                     count: 1,
//                     fill: chartData[4].fill,
//                 };
//             } else {
//                 acc["Older"].count++;
//             }
//         }
//         return acc;
//     }, {} as Record<string, { date: string; count: number; fill: string }>);
// };

export const groupByDay = (data: CandidatesResponseType [] | ApplicationResponseType[]) => {
    return data.reduce((acc, curr) => {
        const createdAt = new Date(curr.created_at);
        const date = createdAt.toISOString().split("T")[0];

        if (!acc[date]) {
            acc[date] = {
                date,
                count: 1,
                fill: "red",
            };
        } else {
            acc[date].count++;
        }
        return acc;
    }, {} as Record<string, { date: string; count: number, fill: string }>);
};

export const RANGE_OPTIONS = {
    last_7_days: {
        label: "Last 7 Days",
        startDate: startOfDay(subDays(new Date(), 6)),
        endDate: null,
    },
    last_30_days: {
        label: "Last 30 Days",
        startDate: startOfDay(subDays(new Date(), 29)),
        endDate: null,
    },
    last_90_days: {
        label: "Last 90 Days",
        startDate: startOfDay(subDays(new Date(), 89)),
        endDate: null,
    },
    last_365_days: {
        label: "Last 365 Days",
        startDate: startOfDay(subDays(new Date(), 364)),
        endDate: null,
    },
    all_time: {
        label: "All Time",
        startDate: null,
        endDate: null,
    },
};

export const getChartDateArray = (startDate: Date, endDate: Date = new Date()) => {
    const days = differenceInDays(endDate, startDate);
    if (days < 30) {
        return {
            array: eachDayOfInterval(interval(startDate, endDate)),
            format: formatDate,
        }
    }

    const weeks = differenceInWeeks(endDate, startDate);
    if (weeks < 30) {
        return {
            array: eachWeekOfInterval(interval(startDate, endDate)),
            format: (date: Date) => {
                const start = max([startOfWeek(date), startDate])
                const end = min([endOfWeek(date), endDate])

                return `${formatDate(start)} - ${formatDate(end)}`
            },
        }
    }

    const months = differenceInMonths(endDate, startDate);
    if (months < 30) {
        return {
            array: eachMonthOfInterval(interval(startDate, endDate)),
            format: new Intl.DateTimeFormat("en", {month: "long", year: "numeric"})
                .format,
        }
    }

    return {
        array: eachYearOfInterval(interval(startDate, endDate)),
        format: new Intl.DateTimeFormat("en", {year: "numeric"}).format,
    }
};

export const DATE_FORMATTER = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
});

export const formatDate = (date: Date) => {
    return DATE_FORMATTER.format(date)
};

export function getRangeOption(range?: string, from?: string, to?: string) {
    if (range == null) {
        const startDate = new Date(from || "")
        const endDate = new Date(to || "")
        if (!isValid(startDate) || !isValid(endDate)) return

        return {
            label: `${formatDate(startDate)} - ${formatDate(endDate)}`,
            startDate,
            endDate,
        }
    }
    return RANGE_OPTIONS[range as keyof typeof RANGE_OPTIONS]
};

 export const getApplicationMatch = (candidate_id: number, jobSkills: JobExperience[], experience: CandidateExperience[]) => {
        const candidateMap = new Map<string, number>();
        experience.forEach((item) => {
            const skill = item.role.trim();
            const years = Number(item.totalExperience) || 0;
            candidateMap.set(skill, Math.max(years, candidateMap.get(skill) ?? 0));
        });

        let matchedCount = 0;
        const matches: MatchResult[] = [];
        jobSkills.forEach((req) => {
            const skill = req.name.trim();
            const required = Number(req.years_experience) || 0;
            const candidateYears = candidateMap.get(skill) ?? 0;

            const isMatch = candidateYears >= required;
            matches.push({
                name: skill,
                candidateYears,
                requiredYears: required,
                match: isMatch,
            });

            if (isMatch) matchedCount++;
        });

        let score = 0;
        const totalRequired = jobSkills.length;
        if (totalRequired > 0) {
            // score = Math.round((matchedCount / totalRequired) * 100);

            // Optional: more nuanced version (partial credit)
            let totalPoints = 0;
            let earnedPoints = 0;

            jobSkills.forEach((req) => {
                const required = req.years_experience || 0;
                const candidate = candidateMap.get(req.name.trim()) || 0;
                totalPoints += required;
                earnedPoints += Math.min(candidate, required);
            });

            score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        }

        return {
            score,
            matchedCount,
            totalRequired,
            skills: matches,
        };
    }

export const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'On Hold': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Closed': return 'bg-zinc-100 text-zinc-600 border-zinc-200';
      case 'Draft': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-zinc-50 text-zinc-700 border-zinc-100';
    }
  };
