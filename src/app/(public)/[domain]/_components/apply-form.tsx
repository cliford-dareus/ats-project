"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Briefcase, CheckCircle2, FileText, GraduationCap, User, Users } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import PersonalInfoForm from "./forms/personal-info";
import WorkExperienceForm from "./forms/work-experience";
import EducationForm from "./forms/education";
import ReviewForm from "./forms/review";
import ReferencesForm from "./forms/references";
import { motion } from "motion/react";
import ProgressSteps from "./progess";
import { cn } from "@/lib/utils";
import { create_application_action } from "@/server/actions/application_actions";
import { applicationSchema } from "@/zod";
import { useDispatch } from "@/hooks/use-plugin-registry";
import { desc } from "drizzle-orm";

type FormValues = z.infer<typeof applicationSchema>;

const STEPS = [
    { id: 1, name: "Personal", icon: User },
    { id: 2, name: "Experience", icon: Briefcase },
    { id: 3, name: "Education", icon: GraduationCap },
    { id: 4, name: "References", icon: Users },
    { id: 5, name: "Review", icon: FileText },
];

const ApplyForm = ({ jobId, subdomain }: { jobId: number; subdomain: string }) => {
    const dispatch = useDispatch();
    const [currentStep, setCurrentStep] = useState(1);
    const [complete, setComplete] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [resumeName, setResumeName] = useState<string | null>(null);

    const {
        register,
        control,
        handleSubmit,
        trigger,
        getValues,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(applicationSchema),
        defaultValues: {
            personalInfo: {
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                address: "",
                city: "",
                state: "",
                zipCode: "",
            },
            workExperience: [{ company: "", position: "", startDate: "", description: "", current: false }],
            education: [{ school: "", degree: "", fieldOfStudy: "", graduationDate: "" }],
            references: [
                { name: "", relationship: "", company: "", email: "", phone: "" },
            ],
            additionalInfo: {
                coverLetter: "",
            }
        },
    });

    const { fields: expFields, append: appendExp, remove: removeExp } = useFieldArray({
        control,
        name: "workExperience",
    });

    const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({
        control,
        name: "education",
    });

    const { fields: refFields, append: appendRef, remove: removeRef } = useFieldArray({
        control,
        name: "references",
    });

    const nextStep = async () => {
        let isValid = false;

        if (currentStep === 1) isValid = await trigger("personalInfo");
        if (currentStep === 2) isValid = await trigger("workExperience");
        if (currentStep === 3) isValid = await trigger("education");
        if (currentStep === 4) isValid = await trigger("references");
        if (currentStep === 5) isValid = true;

        if (isValid) {
            if (currentStep < STEPS.length) {
                setCurrentStep((prev) => prev + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const onSubmit = async (data: z.infer<typeof applicationSchema>) => {
        console.log("Form Submitted:", data);
        const payload = {
            ...data, file: { file_: file as File }, jobId, subdomain
        };
        try {
            // const response = await create_application_action(payload);
            const response = {
                candidateId: 1,
                success: true,
                fileUrl: null,
                message: "",
                fileUrl: "resumes/1779058531569-jouvens-kersaint.pdf",
                applicationId: 1
            };
            if (!response.success) {
                throw new Error(response.message);
            }

            void fireTrigger({
                event: {
                    type: "candidate_applied",
                    candidateId: String(response.candidateId),
                    jobId: String(jobId),
                },
                context: {
                    subdomain: subdomain,   // ← "bridge" | "hisgra" — from params or env
                    jobId: jobId,
                    candidate: { id: response.candidateId, cv_path: response.fileUrl },
                    job: {
                        id: jobId, job_description: `We are looking for a skilled Python Developer with hands-on experience in LangChain and LangGraph to build and optimize AI-driven applications.
                        Visa : Independent Candidates
                        Key Responsibilities:
                        · Develop and maintain Python-based applications
                        · Work with LangChain and LangGraph frameworks for LLM integrations
                        · Design and implement scalable AI/automation workflows
                        · Collaborate with cross-functional teams for solution delivery

                        Required Skills:
                        · Strong experience in Python
                        · Hands-on experience with LangChain and LangGraph
                        · Experience with LLMs / AI integrations
                        · Good problem-solving and communication skills` },
                    settings: {
                        applicationId: response.applicationId
                    },
                },
            });

            // if(response.fileUrl) {
            //     void fireTrigger({
            //         event: {
            //             type: "resume_uploaded",
            //             candidateId: String(response.candidateId),
            //             jobId: String(jobId),
            //             fileUrl: response.fileUrl,
            //         },
            //         context: {
            //             subdomain: subdomain,   // ← "bridge" | "hisgra" — from params or env
            //             jobId: String(jobId),
            //             candidate: { id: String(response.candidateId) },
            //             job: { id: String(jobId) },
            //             settings: {},
            //         }
            //     })
            // }

            // Show success message
            console.log("Application submitted successfully:", response.message);
            setComplete(true);
        } catch (error) {
            console.error("Error submitting application:", error);
            alert("There was an error submitting your application. Please try again.");
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setResumeName(file.name);
            setFile(file);
        }
    };

    if (complete) {
        return (
            <Card className="p-12 text-center max-w-2xl mx-auto mt-20">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="flex justify-center mb-6"
                >
                    <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-12 w-12 text-green-500" />
                    </div>
                </motion.div>
                <h2 className="text-3xl font-bold text-zinc-900 mb-2">Application Submitted!</h2>
                <p className="text-zinc-500 mb-8 max-w-md mx-auto">
                    Thank you for applying to HireSync. We have received your information and our recruiting team will review it shortly.
                </p>
                <Button onClick={() => window.location.reload()} size="lg">
                    Back to Careers
                </Button>
            </Card>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-12">
            <div className="mb-12 text-center">
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 mb-3">Join our team</h1>
                <p className="text-zinc-500">Fast-track your career with our simple application process.</p>
            </div>

            <ProgressSteps steps={STEPS} currentStep={currentStep} />

            <form onSubmit={handleSubmit(onSubmit)}>
                <AnimatePresence mode="wait">
                    {currentStep === 1 &&
                        <PersonalInfoForm register={register} errors={errors} />}
                    {currentStep === 2 &&
                        <WorkExperienceForm register={register} errors={errors} expFields={expFields} appendExp={appendExp} removeExp={removeExp} getValues={getValues} />}
                    {currentStep === 3 &&
                        <EducationForm register={register} errors={errors} eduFields={eduFields} appendEdu={appendEdu} removeEdu={removeEdu} />}
                    {currentStep === 4 &&
                        <ReferencesForm register={register} errors={errors} refFields={refFields} appendRef={appendRef} removeRef={removeRef} fileInputRef={fileInputRef} resumeName={resumeName} handleFileUpload={handleFileUpload} />}
                    {currentStep === 5 &&
                        <ReviewForm register={register} setCurrentStep={setCurrentStep} getValues={getValues} />}
                </AnimatePresence>

                <div className="mt-12 flex items-center justify-between pt-8 border-t border-zinc-100">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        className={cn(currentStep === 1 ? "opacity-0" : "opacity-100")}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>

                    {currentStep === STEPS.length ? (
                        <Button type="submit" size="lg" className="px-8 bg-green-600 hover:bg-green-700 border-green-600">
                            Submit Application <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    ) : (
                        <Button type="button" size="lg" onClick={nextStep} className="px-8">
                            Continue <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                </div>
            </form>

            <Button onClick={() => onSubmit({})}></Button>
        </div>
    );
};

// ── Trigger caller ────────────────────────────────────────────────────────────
// Calls the main app's trigger route from the public careers subdomain.
// Uses NEXT_PUBLIC_API_URL so it works from any subdomain.
// Errors are swallowed — a failed integration should never block the applicant.
async function fireTrigger(body: { event: unknown; context: unknown }) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

    try {
        const res = await fetch(`${apiUrl}/api/trigger/public`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-trigger-secret": process.env.NEXT_PUBLIC_INTERNAL_TRIGGER_SECRET!,
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            console.warn("[Trigger] Integration dispatch failed:", res.status);
        }
    } catch (err) {
        // Network failure — don't surface to the applicant
        console.warn("[Trigger] Integration dispatch error:", err);
    }
}

export default ApplyForm;
