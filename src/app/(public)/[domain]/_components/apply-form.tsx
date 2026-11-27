"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Briefcase, CheckCircle2, ClipboardList, FileText, GraduationCap, User, Users } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import PersonalInfoForm from "./forms/personal-info";
import WorkExperienceForm from "./forms/work-experience";
import EducationForm from "./forms/education";
import ReviewForm from "./forms/review";
import ReferencesForm from "./forms/references";
import ScreeningQuestionsForm from "./forms/screening-questions";
import { motion } from "motion/react";
import ProgressSteps from "./progess";
import { cn } from "@/lib/utils";
import { create_application_action } from "@/server/actions/application_actions";
import { fire_public_trigger_action } from "@/server/actions/trigger-actions";
import { applicationSchema } from "@/zod";
import { validateScreeningAnswers } from "@/lib/screening";
import type { PublicScreeningQuestionDTO } from "@/server/actions/screening-actions";

type FormValues = z.infer<typeof applicationSchema>;

const BASE_STEPS = [
    { id: 1, name: "Personal", icon: User },
    { id: 2, name: "Experience", icon: Briefcase },
    { id: 3, name: "Education", icon: GraduationCap },
    { id: 4, name: "References", icon: Users },
];

const ApplyForm = ({ jobId, subdomain, companyName, screeningQuestions = [] }: {
    jobId: number;
    subdomain: string;
    companyName: string;
    // Public questions for this job, loaded server-side by the apply page.
    // Empty when the job has none — the form then keeps its usual 5 steps.
    screeningQuestions?: PublicScreeningQuestionDTO[];
}) => {
    const hasScreening = screeningQuestions.length > 0;
    // Screening sits between References and Review; Review shifts to 6.
    // With no questions the step list is exactly the original five.
    const STEPS = hasScreening
        ? [
            ...BASE_STEPS,
            { id: 5, name: "Screening", icon: ClipboardList },
            { id: 6, name: "Review", icon: FileText },
        ]
        : [...BASE_STEPS, { id: 5, name: "Review", icon: FileText }];
    const SCREENING_STEP = 5;
    const REVIEW_STEP = hasScreening ? 6 : 5;

    const [currentStep, setCurrentStep] = useState(1);
    const [complete, setComplete] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [screeningAnswers, setScreeningAnswers] = useState<Record<number, string>>({});
    const [screeningErrors, setScreeningErrors] = useState<Record<number, string>>({});
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
            workExperience: [{ company: "", position: "", start_date: "", description: "", current: false }],
            education: [{ school: "", degree: "", field_of_study: "", graduation_date: "" }],
            references: [
                { name: "", relationship: "", company: "", email: "", phone: "" },
            ],
            additionalInfo: {
                coverLetter: "",
                referralSource: "",
                expectedSalary: "",
                earliestStartDate: "",
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
        if (currentStep === REVIEW_STEP) isValid = true;

        // Screening: required questions block advancing. Per-question
        // errors render inline under the question; the first failure
        // message also shows in the form-level error area below.
        if (currentStep === SCREENING_STEP && hasScreening) {
            const submitted = screeningQuestions.map((question) => ({
                questionId: question.id,
                answer: screeningAnswers[question.id] ?? "",
            }));
            const result = validateScreeningAnswers(screeningQuestions, submitted);
            if (!result.success) {
                const nextErrors: Record<number, string> = {};
                for (const question of screeningQuestions) {
                    const raw = (screeningAnswers[question.id] ?? "").trim();
                    if (question.isRequired && raw === "") {
                        nextErrors[question.id] = "This question is required.";
                    } else if (question.type === "number" && raw !== "" && !Number.isFinite(Number(raw))) {
                        nextErrors[question.id] = "Please enter a number.";
                    }
                }
                setScreeningErrors(nextErrors);
                setSubmitError(result.message);
                return;
            }
            setScreeningErrors({});
            isValid = true;
        }

        if (isValid) {
            setSubmitError(null);
            if (currentStep < STEPS.length) {
                setCurrentStep((prev) => prev + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    };

    const prevStep = () => {
        setSubmitError(null);
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const onSubmit = async (data: z.infer<typeof applicationSchema>) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setSubmitError(null);

        const payload = {
            ...data, file: { file_: file as File }, jobId, subdomain
        };

        try {
            // Screening answers ride as the 2nd argument; empty optional
            // answers are omitted (the server skips them too). Server-side
            // failures about answers come back as { success: false,
            // message } and surface through the existing submitError.
            const answers = screeningQuestions
                .map((question) => ({
                    questionId: question.id,
                    answer: (screeningAnswers[question.id] ?? "").trim(),
                }))
                .filter((answer) => answer.answer !== "");
            const response = await create_application_action(payload, answers);
            if (!response.success) {
                // Stay on the Review step and show the server's reason
                // inline instead of failing silently.
                setSubmitError(response.message ?? "There was an error submitting your application. Please try again.");
                return;
            }

            // Fire-and-forget: the server action validates the event, resolves the
            // org from the subdomain and verifies job/candidate ownership before
            // enqueueing. A failed integration must never block the applicant.
            void fire_public_trigger_action({
                event: {
                    type: "candidate_applied",
                    candidateId: String(response?.candidate_id),
                    jobId: String(response?.job_id),
                    applicationId: response?.application_id,
                },
                context: {
                    subdomain: subdomain,   // ← "bridge" | "hisgra" — from params or env
                    jobId: jobId,
                    candidate: { id: response?.candidate_id, cv_path: response?.file_url },
                    job: {
                        id: response?.job_id,
                        job_name: response?.job_name,
                        job_description: response?.job_description
                    },
                    settings: {
                        applicationId: response?.application_id
                    },
                },
            });

            // Show success message
            setComplete(true);
        } catch (error) {
            console.error("Error submitting application:", error);
            setSubmitError("There was an error submitting your application. Please try again.");
        } finally {
            setIsSubmitting(false);
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
                    Thank you for applying to {companyName}. We have received your information and our recruiting team will review it shortly.
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
                        <PersonalInfoForm
                            register={register}
                            errors={errors}
                        />}
                    {currentStep === 2 &&
                        <WorkExperienceForm
                            register={register}
                            errors={errors}
                            expFields={expFields}
                            appendExp={appendExp}
                            removeExp={removeExp}
                            getValues={getValues}
                        />}
                    {currentStep === 3 &&
                        <EducationForm
                            register={register}
                            errors={errors}
                            eduFields={eduFields}
                            appendEdu={appendEdu}
                            removeEdu={removeEdu}
                        />}
                    {currentStep === 4 &&
                        <ReferencesForm
                            register={register}
                            errors={errors}
                            refFields={refFields}
                            appendRef={appendRef}
                            removeRef={removeRef}
                            fileInputRef={fileInputRef}
                            resumeName={resumeName}
                            handleFileUpload={handleFileUpload}
                        />}
                    {currentStep === SCREENING_STEP && hasScreening &&
                        <ScreeningQuestionsForm
                            questions={screeningQuestions}
                            answers={screeningAnswers}
                            onAnswer={(questionId, value) => {
                                setScreeningAnswers((prev) => ({ ...prev, [questionId]: value }));
                                setScreeningErrors((prev) => {
                                    if (!(questionId in prev)) return prev;
                                    const next = { ...prev };
                                    delete next[questionId];
                                    return next;
                                });
                            }}
                            errors={screeningErrors}
                        />}
                    {currentStep === REVIEW_STEP &&
                        <ReviewForm
                            register={register}
                            setCurrentStep={setCurrentStep}
                            getValues={getValues}
                            screeningQuestions={hasScreening ? screeningQuestions : undefined}
                            screeningAnswers={hasScreening ? screeningAnswers : undefined}
                            screeningStep={hasScreening ? SCREENING_STEP : undefined}
                        />}
                </AnimatePresence>

                <div className="mt-12 flex items-center justify-between pt-8 border-t border-zinc-100">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={prevStep}
                        disabled={currentStep === 1 || isSubmitting}
                        className={cn(currentStep === 1 ? "opacity-0" : "opacity-100")}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>

                    {currentStep === STEPS.length ? (
                        <Button type="submit" size="lg" disabled={isSubmitting} className="px-8 bg-green-600 hover:bg-green-700 border-green-600">
                            {isSubmitting ? "Submitting…" : "Submit Application"} <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    ) : (
                        <Button type="button" size="lg" onClick={nextStep} className="px-8">
                            Continue <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                </div>

                {submitError && (
                    <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {submitError}
                    </div>
                )}
            </form>
        </div>
    );
};

export default ApplyForm;
