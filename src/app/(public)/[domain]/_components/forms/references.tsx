import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Plus, Trash2, Upload, Users } from "lucide-react";
import { motion } from "framer-motion";
import { FormInput } from "../fields";

const ReferencesForm = ({ register, errors, refFields, appendRef, removeRef, fileInputRef, resumeName, handleFileUpload }) => {
    return (
        <motion.div
            key="step4"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-black" />
                    <h2 className="text-xl font-bold">References</h2>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendRef({ name: "", relationship: "", company: "", email: "", phone: "" })}
                >
                    <Plus className="h-4 w-4 mr-1" /> Add Reference
                </Button>
            </div>

            {refFields.map((field, index) => (
                <Card key={field.id} className="p-8 relative">
                    {refFields.length > 2 && (
                        <button
                            type="button"
                            onClick={() => removeRef(index)}
                            className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormInput
                            label="Full Name"
                            placeholder="John Smith"
                            {...register(`references.${index}.name`)}
                            error={errors.references?.[index]?.name?.message}
                        />
                        <FormInput
                            label="Relationship"
                            placeholder="Former Manager"
                            {...register(`references.${index}.relationship`)}
                            error={errors.references?.[index]?.relationship?.message}
                        />
                        <FormInput
                            label="Company"
                            placeholder="Previous Corp"
                            {...register(`references.${index}.company`)}
                            error={errors.references?.[index]?.company?.message}
                        />
                        <FormInput
                            label="Email"
                            type="email"
                            placeholder="john@previous.com"
                            {...register(`references.${index}.email`)}
                            error={errors.references?.[index]?.email?.message}
                        />
                        <div className="md:col-span-2">
                            <FormInput
                                label="Phone Number"
                                placeholder="(555) 000-0000"
                                {...register(`references.${index}.phone`)}
                                error={errors.references?.[index]?.phone?.message}
                            />
                        </div>
                    </div>
                </Card>
            ))}

            <hr className="border-zinc-100" />

            <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-black" />
                <h2 className="text-xl font-bold">Resume Upload</h2>
            </div>

            <Card className="p-12 border-dashed border-2 flex flex-col items-center justify-center bg-zinc-50/50">
                <Upload className="h-10 w-10 text-zinc-400 mb-4" />
                <p className="text-sm font-medium mb-1">Click to upload your resume</p>
                <p className="text-xs text-zinc-400 mb-4">PDF, DOCX, or RTF (max. 10MB)</p>
                <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx,.rtf"
                    onChange={handleFileUpload}
                />
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                >
                    Select File
                </Button>
                {resumeName && (
                    <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        {resumeName}
                    </div>
                )}
            </Card>
        </motion.div>
    );
};

export default ReferencesForm;
