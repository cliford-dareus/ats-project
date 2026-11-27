import { ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { FormInput, FormTextarea } from "../fields";
import type { PublicScreeningQuestionDTO } from "@/server/actions/screening-actions";

type Props = {
    questions: PublicScreeningQuestionDTO[];
    answers: Record<number, string>;
    onAnswer: (questionId: number, value: string) => void;
    errors: Record<number, string>;
};

// One step of the public apply form: the job's screening questions, in
// the order the recruiter set. Each type renders as its own control —
// short text is a single-line input, long text a textarea, yes/no and
// single-choice are radios, number is a numeric input. Only rendered
// when the job has questions; otherwise the form keeps its usual steps.
const ScreeningQuestionsForm = ({ questions, answers, onAnswer, errors }: Props) => {
    return (
        <motion.div
            key="screening"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-6"
        >
            <Card className="p-8">
                <div className="flex items-center gap-2 mb-6">
                    <ClipboardList className="h-5 w-5 text-black" />
                    <h2 className="text-xl font-bold">Screening Questions</h2>
                </div>
                <p className="text-sm text-zinc-500 -mt-4 mb-6">
                    Please answer the following questions about this role.
                </p>
                <div className="space-y-6">
                    {questions.map((question) => {
                        const value = answers[question.id] ?? "";
                        const error = errors[question.id];
                        const label = question.isRequired
                            ? `${question.questionText} *`
                            : question.questionText;
                        return (
                            <div key={question.id} className="space-y-1.5 text-left">
                                {question.type === "short_text" && (
                                    <FormInput
                                        id={`screening-${question.id}`}
                                        label={label}
                                        placeholder="Your answer"
                                        value={value}
                                        onChange={(e) => onAnswer(question.id, e.target.value)}
                                        error={error}
                                    />
                                )}
                                {question.type === "long_text" && (
                                    <FormTextarea
                                        id={`screening-${question.id}`}
                                        label={label}
                                        placeholder="Your answer"
                                        value={value}
                                        onChange={(e) => onAnswer(question.id, e.target.value)}
                                        error={error}
                                    />
                                )}
                                {question.type === "number" && (
                                    <FormInput
                                        id={`screening-${question.id}`}
                                        label={label}
                                        type="number"
                                        inputMode="decimal"
                                        placeholder="e.g. 5"
                                        value={value}
                                        onChange={(e) => onAnswer(question.id, e.target.value)}
                                        error={error}
                                    />
                                )}
                                {(question.type === "yes_no" || question.type === "single_choice") && (
                                    <>
                                        <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                            {label}
                                        </span>
                                        <div className="space-y-2 pt-1">
                                            {(question.type === "yes_no" ? ["yes", "no"] : (question.options ?? [])).map(
                                                (option) => (
                                                    <label
                                                        key={option}
                                                        className="flex items-center gap-2 text-sm cursor-pointer"
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={`screening-${question.id}`}
                                                            value={option}
                                                            checked={value === option}
                                                            onChange={() => onAnswer(question.id, option)}
                                                            className="h-4 w-4 accent-black"
                                                        />
                                                        <span className="capitalize">{option}</span>
                                                    </label>
                                                ),
                                            )}
                                        </div>
                                        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>
        </motion.div>
    );
};

export default ScreeningQuestionsForm;
