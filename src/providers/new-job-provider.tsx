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
    jobInfo: {
        job_name: "",
        job_description: "",
        job_location: "",
        job_type: "FULL_TIME",
        salary_up_to: "",
        salary_from: "",
        department: "",
        organization: ""
    },
    jobTechnology: [],
    jobStages: [],
};

export const WIZARD_STORAGE_KEY = 'multi-page-form-demo-newDealData';
const LOCAL_STORAGE_KEY = WIZARD_STORAGE_KEY;
// The in-progress draft's job id lives under its own key: the wizard's
// server-side persistence is the DRAFT row, and the id is what ties the
// browser's in-progress form to that row across refreshes.
const DRAFT_ID_KEY = LOCAL_STORAGE_KEY + ':draftId';

// A draft row shaped for the wizard, as returned by get_job_draft_action.
// draftId is null when the wizard is carrying unsaved (pre-draft) data.
export type WizardDraftData = {
    draftId: number | null;
    jobInfo: z.infer<typeof jobFormSchema>["jobInfo"];
    jobTechnology: z.infer<typeof jobFormSchema>["jobTechnology"];
    jobStages: z.infer<typeof jobFormSchema>["jobStages"];
};

type newJobContextType = {
    newJobData: typeof jobFormSchema._type;
    updateNewJobDetails: (newInfo: any, stage: string) => void;
    updateStageOptions: (newStages: z.infer<typeof jobStageSchema>[]) => void;
    dataLoaded: boolean;
    removeJob: (remove: any, stage: string) => void;
    resetLocalStorage: () => void;
    // Removes the browser copy only (keys), without touching the in-memory
    // form state — used right before a publish/draft-save dispatch, whose
    // success is a server redirect. The step-one form resets the in-memory
    // state on the next fresh entry (see StepOneForm).
    clearWizardStorage: () => void;
    draftJobId: number | null;
    setDraftJobId: (id: number | null) => void;
    loadDraft: (draft: WizardDraftData) => void;
};

export const NewJobContext = createContext<newJobContextType | null>(null);

export const NewJobContextProvider = ({ children }: { children: React.ReactNode; }) => {
    const [newJobData, setNewJobData] = useState<typeof jobFormSchema._type>(defaultJobListing);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [draftJobId, setDraftJobId] = useState<number | null>(null);
    // Set by loadDraft before this provider's mount effect runs (child
    // effects run first), so a server-loaded draft is never clobbered by
    // the localStorage read below.
    const draftHydratedRef = React.useRef(false);

    const loadDraft = useCallback((draft: WizardDraftData) => {
        draftHydratedRef.current = true;
        setNewJobData({
            jobInfo: draft.jobInfo,
            jobTechnology: draft.jobTechnology,
            jobStages: draft.jobStages,
        });
        setDraftJobId(draft.draftId);
    }, []);

    useEffect(() => {
        if (!draftHydratedRef.current) {
            readFromLocalStorage();
        }
        const storedDraftId = localStorage.getItem(DRAFT_ID_KEY);
        if (storedDraftId) {
            const id = parseInt(storedDraftId, 10);
            if (!Number.isNaN(id)) setDraftJobId(id);
        }
        setDataLoaded(true);
    }, []);

    useEffect(() => {
        if (dataLoaded) {
            saveDataToLocalStorage(newJobData);
        }
    }, [newJobData, dataLoaded]);

    useEffect(() => {
        if (!dataLoaded) return;
        if (draftJobId === null) {
            localStorage.removeItem(DRAFT_ID_KEY);
        } else {
            localStorage.setItem(DRAFT_ID_KEY, String(draftJobId));
        }
    }, [draftJobId, dataLoaded]);

    const updateNewJobDetails = useCallback(
        (newInfo: { newInfo: any }, stage: string) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            setNewJobData({ ...newJobData, [stage]: { ...newJobData[stage], ...newInfo } });

            if (stage === "jobTechnology") {
                setNewJobData({
                    ...newJobData,
                    [stage]: [...newJobData[stage], newInfo as unknown as typeof jobTechSchema._type]
                });
            }

            if (stage === "jobStages") {
                setNewJobData({
                    ...newJobData,
                    [stage]: [...newJobData[stage], newInfo as unknown as typeof jobStageSchema._type]
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
        localStorage.removeItem(DRAFT_ID_KEY);
        setNewJobData(defaultJobListing);
        setDraftJobId(null);
    };

    const clearWizardStorage = () => {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(DRAFT_ID_KEY);
    };

    const contextValue = useMemo(
        () => ({
            newJobData,
            dataLoaded,
            updateNewJobDetails,
            updateStageOptions,
            resetLocalStorage,
            clearWizardStorage,
            removeJob,
            draftJobId,
            setDraftJobId,
            loadDraft,
        }),
        [newJobData, dataLoaded, updateNewJobDetails, draftJobId, loadDraft]
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
