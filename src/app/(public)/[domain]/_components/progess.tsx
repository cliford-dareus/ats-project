import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
    id: number;
    name: string;
};

const ProgressSteps = ({ steps, currentStep }: { steps: Step[]; currentStep: number }) => {
    return (
        <nav aria-label="Progress" className="mb-8">
            <ol role="list" className="flex items-center justify-between w-full">
                {steps.map((step, stepIdx) => (
                    <li key={step.name} className={cn(stepIdx !== steps.length - 1 ? "flex-1 pr-4" : "", "relative")}>
                        <div className="flex items-center">
                            {currentStep > step.id ? (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
                                    <Check className="h-5 w-5" aria-hidden="true" />
                                </div>
                            ) : currentStep === step.id ? (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white text-black">
                                    <span className="text-sm font-bold">{step.id}</span>
                                </div>
                            ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-200 bg-white text-zinc-400">
                                    <span className="text-sm font-medium">{step.id}</span>
                                </div>
                            )}

                            <div className="ml-3 hidden md:block">
                                <p className={cn(
                                    "text-xs font-semibold uppercase tracking-wider",
                                    currentStep >= step.id ? "text-black" : "text-zinc-400"
                                )}>
                                    {step.name}
                                </p>
                            </div>

                            {stepIdx !== steps.length - 1 && (
                                <div className="ml-4 flex-1 h-0.5 bg-zinc-200 md:block hidden">
                                    <div
                                        className="h-full bg-black transition-all duration-500"
                                        style={{ width: currentStep > step.id ? '100%' : '0%' }}
                                    />
                                </div>
                            )}
                        </div>
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default ProgressSteps;
