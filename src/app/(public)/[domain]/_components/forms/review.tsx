import { Textarea } from "@/components/ui/textarea";
import { Briefcase, FileText, GraduationCap, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

const ReviewForm = ({ register, setCurrentStep, getValues }) => {
    return (
        <motion.div
            key="step5"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-6"
        >
            <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-black" />
                <h2 className="text-xl font-bold">Review Your Application</h2>
            </div>

            {/* Review Section */}
            <div className="space-y-4">
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4 border-bottom pb-2">
                        <h3 className="font-bold flex items-center gap-2"><User className="h-4 w-4" /> Personal</h3>
                        <button type="button" onClick={() => setCurrentStep(1)} className="text-xs text-zinc-500 hover:underline">Edit</button>
                    </div>
                    <div className="grid grid-cols-2 gap-y-3 text-sm">
                        <div>
                            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Full Name</p>
                            <p>{getValues("personalInfo.firstName")} {getValues("personalInfo.lastName")}</p>
                        </div>
                        <div>
                            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Email</p>
                            <p className="truncate">{getValues("personalInfo.email")}</p>
                        </div>
                        <div>
                            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Phone</p>
                            <p>{getValues("personalInfo.phone")}</p>
                        </div>
                        <div>
                            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Address</p>
                            <p>{getValues("personalInfo.city")}, {getValues("personalInfo.state")}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4 border-bottom pb-2">
                        <h3 className="font-bold flex items-center gap-2"><Briefcase className="h-4 w-4" /> Experience</h3>
                        <button type="button" onClick={() => setCurrentStep(2)} className="text-xs text-zinc-500 hover:underline">Edit</button>
                    </div>
                    <div className="space-y-4">
                        {getValues("workExperience").map((exp, i) => (
                            <div key={i} className="text-sm">
                                <p className="font-bold">{exp.position}</p>
                                <p className="text-zinc-500">{exp.company} • {exp.startDate} to {exp.current ? 'Present' : exp.endDate}</p>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4 border-bottom pb-2">
                        <h3 className="font-bold flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Education</h3>
                        <button type="button" onClick={() => setCurrentStep(3)} className="text-xs text-zinc-500 hover:underline">Edit</button>
                    </div>
                    <div className="space-y-4">
                        {getValues("education").map((edu, i) => (
                            <div key={i} className="text-sm">
                                <p className="font-bold">{edu.degree} in {edu.fieldOfStudy}</p>
                                <p className="text-zinc-500">{edu.school} • Graduated {edu.graduationDate}</p>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4 border-bottom pb-2">
                        <h3 className="font-bold flex items-center gap-2"><Users className="h-4 w-4" /> References</h3>
                        <button type="button" onClick={() => setCurrentStep(4)} className="text-xs text-zinc-500 hover:underline">Edit</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getValues("references").map((ref, i) => (
                            <div key={i} className="text-sm bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                                <p className="font-bold">{ref.name}</p>
                                <p className="text-zinc-500">{ref.relationship} at {ref.company}</p>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4 border-bottom pb-2">
                        <h3 className="font-bold flex items-center gap-2"><FileText className="h-4 w-4" /> Additional</h3>
                    </div>
                    <Textarea
                        label="Anything else you'd like us to know?"
                        placeholder="Cover letter or additional details..."
                        {...register("additionalInfo.coverLetter")}
                    />
                </Card>
            </div>
        </motion.div>
    );
};

export default ReviewForm;
