'use client';

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { jobFormSchema, jobStageSchema, jobTechSchema } from "@/zod";
import { z } from "zod";

const defaultJobListing: z.infer<typeof jobFormSchema> = {
    jobInfo: { job_name: "", job_description: "", job_location: "", salary_up_to: "", department: "", organization: "" },
    jobTechnology: [],
    jobStages: [],
    jobOptional: { job_effective_date: new Date(), job_agency: "" }
};

const LOCAL_STORAGE_KEY = 'multi-page-form-demo-newDealData';

type newJobContextType = {
    newJobData: z.infer<typeof jobFormSchema>;
    updateNewJobDetails: (newInfo: any, stage: string) => void;
    updateStageOptions: (newStages: z.infer<typeof jobStageSchema>[]) => void;
    dataLoaded: boolean;
    removeJob: (remove: any, stage: string) => void;
    resetLocalStorage: () => void;
};

export const NewJobContext = createContext<newJobContextType | null>(null);

export const NewJobContextProvider = ({ children }: { children: React.ReactNode; }) => {
    const [newJobData, setNewJobData] = useState<z.infer<typeof jobFormSchema>>(defaultJobListing);
    const [dataLoaded, setDataLoaded] = useState(false);

    useEffect(() => {
        readFromLocalStorage();
        setDataLoaded(true);
    }, []);

    useEffect(() => {
        if (dataLoaded) {
            saveDataToLocalStorage(newJobData);
        }
    }, [newJobData, dataLoaded]);

    const updateNewJobDetails = useCallback(
        (newInfo: { newInfo: any }, stage: string) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            setNewJobData({ ...newJobData, [stage]: { ...newJobData[stage], ...newInfo } });

            if (stage === "jobTechnology") {
                setNewJobData({
                    ...newJobData,
                    [stage]: [...newJobData[stage], newInfo as unknown as z.infer<typeof jobTechSchema>]
                });
            }

            if (stage === "jobStages") {
                setNewJobData({
                    ...newJobData,
                    [stage]: [...newJobData[stage], newInfo as unknown as z.infer<typeof jobStageSchema>]
                });
            }
        },
        [newJobData]
    );

    const updateStageOptions = (newStages: z.infer<typeof jobStageSchema>[]) => {
        setNewJobData({ ...newJobData, jobStages: newStages });
    };

    const removeJob = useCallback(
        (remove: any, stage: string) => {
            if (stage === "jobTechnology") {
                const filter = newJobData.jobTechnology.filter((item) => item.technology !== remove.technology);
                setNewJobData({ ...newJobData, jobTechnology: filter });
            }

            if (stage === "jobStages") {
                const filter = newJobData.jobStages.filter((item) => item.stage_name !== remove.stage_name);
                setNewJobData({ ...newJobData, jobStages: filter });
            }
        },
        [newJobData]
    )

    const saveDataToLocalStorage = (
        currentDealData: z.infer<typeof jobFormSchema>
    ) => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentDealData));
    };

    const readFromLocalStorage = () => {
        const loadedDataString = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!loadedDataString) return setNewJobData(defaultJobListing);
        const validated = jobFormSchema.safeParse(
            JSON.parse(loadedDataString)
        );

        if (validated.success) {
            setNewJobData(validated.data);
        } else {
            setNewJobData(defaultJobListing);
        }
    };

    const resetLocalStorage = () => {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setNewJobData(defaultJobListing);
    };

    const contextValue = useMemo(
        () => ({
            newJobData,
            dataLoaded,
            updateNewJobDetails,
            updateStageOptions,
            resetLocalStorage,
            removeJob
        }),
        [newJobData, dataLoaded, updateNewJobDetails]
    );

    return (
        <NewJobContext.Provider value={contextValue}>
            {children}
        </NewJobContext.Provider>
    );
};

export function useNewJobContext() {
    const context = useContext(NewJobContext);
    if (context === null) {
        throw new Error(
            'useAddDealContext must be used within a AddDealContextProvider'
        );
    }
    return context;
};
