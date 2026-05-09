import { Clock } from "lucide-react";
import { FormField, FormLabel } from "../ui/form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const SmartTriggerDelayForm = ({ form }: { form: any }) => {
    return (
        <div>
            <FormLabel className="text-base font-medium mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Delay Execution
            </FormLabel>
            <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg border">
                <FormField
                    control={form.control}
                    name="delay"
                    render={({ field }) => (
                        <Input
                            type="number"
                            className="w-28"
                            min={0}
                            {...field}
                        />
                    )}
                />
                <FormField
                    control={form.control}
                    name="delayFormat"
                    render={({ field }) => (
                        <div className="flex gap-2">
                            {["minutes", "hours", "days"].map((unit) => (
                                <Button
                                    key={unit}
                                    type="button"
                                    variant={field.value === unit ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => field.onChange(unit)}
                                >
                                    {unit}
                                </Button>
                            ))}
                        </div>
                    )}
                />
            </div>
        </div>
    );
};

export default SmartTriggerDelayForm;
