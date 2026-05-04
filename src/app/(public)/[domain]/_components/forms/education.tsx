import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { FormInput } from "../fields";

const EducationForm = ({ register, errors, eduFields, appendEdu, removeEdu }) => {
    return (
        <motion.div
            key="step3"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-black" />
                    <h2 className="text-xl font-bold">Education</h2>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendEdu({ school: "", degree: "", fieldOfStudy: "", graduationDate: "" })}
                >
                    <Plus className="h-4 w-4 mr-1" /> Add School
                </Button>
            </div>

            {eduFields.map((field, index) => (
                <Card key={field.id} className="p-8 relative">
                    {eduFields.length > 1 && (
                        <button
                            type="button"
                            onClick={() => removeEdu(index)}
                            className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="School / University"
                            placeholder="University of Oxford"
                            {...register(`education.${index}.school`)}
                            error={errors.education?.[index]?.school?.message}
                        />
                        <FormInput
                            label="Degree"
                            placeholder="Bachelor's Degree"
                            {...register(`education.${index}.degree`)}
                            error={errors.education?.[index]?.degree?.message}
                        />
                        <FormInput
                            label="Field of Study"
                            placeholder="Computer Science"
                            {...register(`education.${index}.fieldOfStudy`)}
                            error={errors.education?.[index]?.fieldOfStudy?.message}
                        />
                        <FormInput
                            label="Graduation Date"
                            type="date"
                            {...register(`education.${index}.graduationDate`)}
                            error={errors.education?.[index]?.graduationDate?.message}
                        />
                    </div>
                </Card>
            ))}
        </motion.div>
    );
};

export default EducationForm;
