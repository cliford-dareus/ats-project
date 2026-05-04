import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { FormCheckbox, FormInput, FormTextarea } from "../fields";


const WorkExperienceForm = ({ register, errors, expFields, appendExp, removeExp, getValues }) => {
    return (
        <motion.div
            key="step2"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-black" />
                    <h2 className="text-xl font-bold">Work Experience</h2>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendExp({ company: "", position: "", startDate: "", description: "", current: false })}
                >
                    <Plus className="h-4 w-4 mr-1" /> Add Job
                </Button>
            </div>

            {expFields.map((field, index) => (
                <Card key={field.id} className="p-8 relative">
                    {expFields.length > 1 && (
                        <button
                            type="button"
                            onClick={() => removeExp(index)}
                            className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="Company"
                            placeholder="Acme Corp"
                            {...register(`workExperience.${index}.company`)}
                            error={errors.workExperience?.[index]?.company?.message}
                        />
                        <FormInput
                            label="Job Title"
                            placeholder="Senior Engineer"
                            {...register(`workExperience.${index}.position`)}
                            error={errors.workExperience?.[index]?.position?.message}
                        />
                        <FormInput
                            label="Start Date"
                            type="date"
                            {...register(`workExperience.${index}.startDate`)}
                            error={errors.workExperience?.[index]?.startDate?.message}
                        />
                        <FormInput
                            label="End Date"
                            type="date"
                            disabled={getValues(`workExperience.${index}.current`)}
                            {...register(`workExperience.${index}.endDate`)}
                            error={errors.workExperience?.[index]?.endDate?.message}
                        />
                        <div className="md:col-span-2">
                            <FormCheckbox
                                label="I currently work here"
                                {...register(`workExperience.${index}.current`)}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <FormTextarea
                                label="Description"
                                placeholder="Tell us about your achievements..."
                                {...register(`workExperience.${index}.description`)}
                                error={errors.workExperience?.[index]?.description?.message}
                            />
                        </div>
                    </div>
                </Card>
            ))}
        </motion.div>
    );
};

export default WorkExperienceForm;
