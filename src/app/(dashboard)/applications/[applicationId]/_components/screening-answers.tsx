import { ListChecks } from "lucide-react";
import { get_screening_answers_for_application_action } from "@/server/actions/screening-actions";

// Screening answers for one application, shown in the right column of
// the application detail page under Application Details — where the
// application's own fields already render. Server component: it loads
// via the application:view-gated action and renders the answers in the
// order returned (snapshot sort_order, then id), so deleting or
// reordering a question later cannot scramble them. Answers whose
// question was deleted keep rendering from their snapshots.
const ScreeningAnswers = async ({ applicationId }: { applicationId: number }) => {
    const result = await get_screening_answers_for_application_action(applicationId);

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-muted-foreground" />
                Screening Answers
            </h3>

            {!Array.isArray(result) ? (
                <p className="text-sm text-muted-foreground">
                    Could not load screening answers.
                </p>
            ) : result.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No screening answers for this application.
                </p>
            ) : (
                <div className="space-y-3 text-sm">
                    {result.map((answer) => {
                        const display =
                            answer.questionType === "yes_no" && answer.answer !== ""
                                ? answer.answer.charAt(0).toUpperCase() + answer.answer.slice(1).toLowerCase()
                                : answer.answer;
                        return (
                            <div key={answer.id}>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    {answer.questionText}
                                </p>
                                <p className="text-foreground whitespace-pre-wrap">{display}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ScreeningAnswers;
