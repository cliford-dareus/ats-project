'use client';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {formSchema, newJobType} from "@/schema";
import {z} from "zod";

const defaultJobListing: z.infer<typeof formSchema>  = {
    jobInfo: {job_name: "", job_description: "", job_location: "", salary_up_to: ""},
    jobTechnology: [],
    jobStages: [],
    jobOptional: {job_effective_date: new Date(), job_agency: ""}
};

const LOCAL_STORAGE_KEY = 'multi-page-form-demo-newDealData';

type newJobContextType = {
    newJobData: z.infer<typeof formSchema>;
    updateNewJobDetails: (dealDetails: Partial<newJobType>) => void;
    dataLoaded: boolean;
    resetLocalStorage: () => void;
};

export const AddDealContext = createContext<newJobContextType | null>(null);

export const AddDealContextProvider = ({children}: { children: React.ReactNode; }) => {
    const [newJobData, setNewJobData] = useState<z.infer<typeof formSchema>>(defaultJobListing);
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
        (JobDetails: Partial<newJobType>) => {
            setNewJobData({ ...newJobData, ...JobDetails });
        },
        [newJobData]
    );

    const saveDataToLocalStorage = (
        currentDealData: z.infer<typeof formSchema>
    ) => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentDealData));
    };

    const readFromLocalStorage = () => {
        const loadedDataString = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!loadedDataString) return setNewJobData(defaultJobListing);
        const validated = formSchema.safeParse(
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
            resetLocalStorage,
        }),
        [newJobData, dataLoaded, updateNewJobDetails]
    );

    return (
        <AddDealContext.Provider value={contextValue}>
            {children}
        </AddDealContext.Provider>
    );
};

export function useAddDealContext() {
    const context = useContext(AddDealContext);
    if (context === null) {
        throw new Error(
            'useAddDealContext must be used within a AddDealContextProvider'
        );
    }
    return context;
}