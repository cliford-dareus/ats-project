import { cn } from "@/lib/utils";

export const ONBOARDING_STEPS = [
    { id: "intro", label: "Welcome" },
    { id: "organization", label: "Organization" },
    { id: "create", label: "Create" },
    { id: "department", label: "Departments" },
    { id: "invite", label: "Invite" },
    { id: "success", label: "Done" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

type Props = {
    /** Current step. `null` hides the stepper (join branch — an alternate path off Organization). */
    current: OnboardingStepId | null;
};

/**
 * Segmented progress indicator for the onboarding flow.
 * Token-only styling (primary / muted) so it works in light and dark mode.
 */
const OnboardingStepper = ({ current }: Props) => {
    if (!current) return null;

    const current_index = ONBOARDING_STEPS.findIndex((step) => step.id === current);
    const total = ONBOARDING_STEPS.length;

    return (
        <div
            className="w-full space-y-2.5"
            role="progressbar"
            aria-valuenow={current_index + 1}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-label={`Onboarding step ${current_index + 1} of ${total}: ${ONBOARDING_STEPS[current_index]?.label}`}
        >
            <div className="flex gap-1.5">
                {ONBOARDING_STEPS.map((step, index) => (
                    <div
                        key={step.id}
                        className={cn(
                            "h-1.5 flex-1 rounded-full transition-colors",
                            index <= current_index ? "bg-primary" : "bg-muted",
                        )}
                    />
                ))}
            </div>
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>
                    Step {current_index + 1} of {total}
                </span>
                <span>{ONBOARDING_STEPS[current_index]?.label}</span>
            </div>
        </div>
    );
};

export default OnboardingStepper;
