"use client";

import { useCallback, useEffect, useState } from "react";
import {
    create_screening_question_action,
    delete_screening_question_action,
    get_screening_questions_for_job_action,
    reorder_screening_questions_action,
    update_screening_question_action,
    type ScreeningQuestionDTO,
} from "@/server/actions/screening-actions";
import type { ScreeningQuestionInput, ScreeningQuestionType } from "@/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronUp, ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";

// Screening-questions editor for the job wizard (step two, Requirements).
//
// The questions live on the draft job row, so this editor only renders its
// controls once a draft job id exists — step one creates the DRAFT row and
// redirects here with ?draft=<id>, so by step two the id is normally set.
// Rendered inside the step-two <form>, so every control here is
// type="button" and every input is controlled with no `name` attribute:
// nothing in this editor may leak into the step-two form submission.

const TYPE_LABELS: Record<ScreeningQuestionType, string> = {
    short_text: "Short answer",
    long_text: "Long answer",
    yes_no: "Yes / No",
    single_choice: "Single choice",
    number: "Number",
};

const QUESTION_TYPES = Object.keys(TYPE_LABELS) as ScreeningQuestionType[];

type EditorForm = {
    questionText: string;
    type: ScreeningQuestionType;
    options: string[];
    isRequired: boolean;
};

const emptyForm = (): EditorForm => ({
    questionText: "",
    type: "short_text",
    options: ["", ""],
    isRequired: false,
});

const toForm = (question: ScreeningQuestionDTO): EditorForm => ({
    questionText: question.questionText,
    type: question.type,
    options: question.type === "single_choice" ? [...(question.options ?? ["", ""])] : ["", ""],
    isRequired: question.isRequired,
});

const ScreeningQuestionsEditor = ({ jobId }: { jobId: number | null }) => {
    const [questions, setQuestions] = useState<ScreeningQuestionDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | "new" | null>(null);
    const [form, setForm] = useState<EditorForm>(emptyForm());
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);

    const load = useCallback(async (id: number) => {
        setLoading(true);
        setError(null);
        try {
            const result = await get_screening_questions_for_job_action(id);
            if (Array.isArray(result)) {
                setQuestions(result);
            } else {
                setError(result.message ?? "Could not load screening questions.");
            }
        } catch {
            setError("Could not load screening questions.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (jobId === null) return;
        setEditingId(null);
        setForm(emptyForm());
        void load(jobId);
    }, [jobId, load]);

    const startAdd = () => {
        setForm(emptyForm());
        setFormError(null);
        setNotice(null);
        setEditingId("new");
    };

    const startEdit = (question: ScreeningQuestionDTO) => {
        setForm(toForm(question));
        setFormError(null);
        setNotice(null);
        setEditingId(question.id);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm(emptyForm());
        setFormError(null);
    };

    const handleSave = async () => {
        if (jobId === null) return;
        const questionText = form.questionText.trim();
        if (!questionText) {
            setFormError("Question text is required.");
            return;
        }
        const options =
            form.type === "single_choice"
                ? form.options.map((option) => option.trim()).filter(Boolean)
                : undefined;
        if (form.type === "single_choice" && (!options || options.length < 2)) {
            setFormError("Single-choice questions need at least 2 options.");
            return;
        }
        if (options && options.length > 10) {
            setFormError("Single-choice questions allow at most 10 options.");
            return;
        }

        const input: ScreeningQuestionInput = {
            questionText,
            type: form.type,
            ...(options ? { options } : {}),
            isRequired: form.isRequired,
        };

        setSaving(true);
        setFormError(null);
        setError(null);
        try {
            const result =
                editingId === "new"
                    ? await create_screening_question_action(jobId, input)
                    : await update_screening_question_action(editingId as number, input);
            if ("error" in result) {
                setFormError(result.message ?? "Could not save the question.");
                return;
            }
            if (editingId === "new") {
                setQuestions((prev) => [...prev, result.question]);
                setNotice("Question added.");
            } else {
                setQuestions((prev) =>
                    prev.map((question) => (question.id === result.question.id ? result.question : question)),
                );
                setNotice("Question updated.");
            }
            cancelEdit();
        } catch {
            setFormError("Could not save the question. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (question: ScreeningQuestionDTO) => {
        if (!window.confirm(`Delete this screening question?\n\n"${question.questionText}"\n\nAnswers already given to it are kept on the applications.`)) {
            return;
        }
        setBusyId(question.id);
        setError(null);
        setNotice(null);
        try {
            const result = await delete_screening_question_action(question.id);
            if ("error" in result) {
                setError(result.message ?? "Could not delete the question.");
                return;
            }
            setQuestions((prev) => prev.filter((item) => item.id !== question.id));
            if (editingId === question.id) cancelEdit();
            setNotice("Question deleted.");
        } catch {
            setError("Could not delete the question. Please try again.");
        } finally {
            setBusyId(null);
        }
    };

    const handleMove = async (index: number, direction: -1 | 1) => {
        if (jobId === null) return;
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= questions.length) return;
        const reordered = [...questions];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(nextIndex, 0, moved);
        const previous = questions;
        setQuestions(reordered);
        setError(null);
        setNotice(null);
        try {
            const result = await reorder_screening_questions_action(
                jobId,
                reordered.map((question) => question.id),
            );
            if ("error" in result) {
                setQuestions(previous);
                setError(result.message ?? "Could not reorder the questions.");
                return;
            }
            setNotice("Questions reordered.");
        } catch {
            setQuestions(previous);
            setError("Could not reorder the questions. Please try again.");
        }
    };

    const setOption = (index: number, value: string) => {
        setForm((prev) => ({
            ...prev,
            options: prev.options.map((option, i) => (i === index ? value : option)),
        }));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ListChecks size={20} className="text-primary" />
                    Screening Questions
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Ask applicants a few questions before they apply. Required questions must be
                    answered on the apply form.
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {jobId === null ? (
                    <p className="text-sm text-muted-foreground">
                        Complete step 1 first — screening questions are saved on the job draft
                        once it exists.
                    </p>
                ) : (
                    <>
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        {notice && <p className="text-sm text-emerald-600">{notice}</p>}

                        {loading ? (
                            <p className="text-sm text-muted-foreground">Loading questions…</p>
                        ) : questions.length === 0 && editingId === null ? (
                            <p className="text-sm text-muted-foreground">
                                No screening questions yet. Applicants will see the usual apply form.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {questions.map((question, index) => (
                                    <div
                                        key={question.id}
                                        className="p-4 bg-card border border-border rounded-lg"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex flex-col gap-1 pt-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    disabled={index === 0}
                                                    onClick={() => void handleMove(index, -1)}
                                                    aria-label="Move question up"
                                                >
                                                    <ChevronUp size={16} />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    disabled={index === questions.length - 1}
                                                    onClick={() => void handleMove(index, 1)}
                                                    aria-label="Move question down"
                                                >
                                                    <ChevronDown size={16} />
                                                </Button>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-foreground">
                                                    <span className="text-muted-foreground mr-2">{index + 1}.</span>
                                                    {question.questionText}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                                    <Badge variant="secondary">{TYPE_LABELS[question.type]}</Badge>
                                                    {question.isRequired && (
                                                        <Badge variant="outline">Required</Badge>
                                                    )}
                                                    {question.type === "single_choice" && question.options && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {question.options.join(" · ")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={busyId === question.id}
                                                    onClick={() => startEdit(question)}
                                                    aria-label="Edit question"
                                                >
                                                    <Pencil size={16} />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={busyId === question.id}
                                                    onClick={() => void handleDelete(question)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    aria-label="Delete question"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {editingId !== null && (
                            <div className="border-2 border-dashed border-border rounded-lg p-6 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Question *
                                    </Label>
                                    <Input
                                        value={form.questionText}
                                        maxLength={500}
                                        onChange={(e) =>
                                            setForm((prev) => ({ ...prev, questionText: e.target.value }))
                                        }
                                        placeholder="e.g. Are you legally authorized to work in the United States?"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Answer type
                                        </Label>
                                        <Select
                                            value={form.type}
                                            onValueChange={(value) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    type: value as ScreeningQuestionType,
                                                    options:
                                                        value === "single_choice" && prev.options.length < 2
                                                            ? ["", ""]
                                                            : prev.options,
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select answer type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {QUESTION_TYPES.map((type) => (
                                                    <SelectItem key={type} value={type}>
                                                        {TYPE_LABELS[type]}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Required
                                        </Label>
                                        <div className="flex items-center gap-2 h-10">
                                            <Switch
                                                checked={form.isRequired}
                                                onCheckedChange={(checked) =>
                                                    setForm((prev) => ({ ...prev, isRequired: checked }))
                                                }
                                            />
                                            <span className="text-sm text-muted-foreground">
                                                Applicants must answer this
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {form.type === "single_choice" && (
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Options (2–10)
                                        </Label>
                                        <div className="space-y-2">
                                            {form.options.map((option, index) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <Input
                                                        value={option}
                                                        onChange={(e) => setOption(index, e.target.value)}
                                                        placeholder={`Option ${index + 1}`}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={form.options.length <= 2}
                                                        onClick={() =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                options: prev.options.filter((_, i) => i !== index),
                                                            }))
                                                        }
                                                        aria-label={`Remove option ${index + 1}`}
                                                    >
                                                        <X size={16} />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={form.options.length >= 10}
                                            onClick={() =>
                                                setForm((prev) => ({ ...prev, options: [...prev.options, ""] }))
                                            }
                                        >
                                            <Plus size={16} className="mr-1" /> Add option
                                        </Button>
                                    </div>
                                )}

                                {formError && <p className="text-sm text-red-600">{formError}</p>}

                                <div className="flex gap-2">
                                    <Button type="button" onClick={() => void handleSave()} disabled={saving} className="flex-1">
                                        {saving ? "Saving…" : editingId === "new" ? "Add Question" : "Save Question"}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={cancelEdit} className="flex-1">
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}

                        {editingId === null && (
                            <Button type="button" variant="outline" className="w-full h-12 border-dashed" onClick={startAdd}>
                                <Plus size={18} className="mr-2" />
                                Add Screening Question
                            </Button>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default ScreeningQuestionsEditor;
